import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { StorageService } from '../../storage/storage.service';
import { WsGateway } from '../../ws/ws.gateway';

interface MixcutJobData {
  jobId: string;
  userId: string;
  inputConfig: any;
  editingConfig: any;
  outputConfig: any;
  videoCount: number;
}

@Processor('mixcut-production', { concurrency: 3 })
export class MixcutProductionProcessor extends WorkerHost {
  private readonly logger = new Logger(MixcutProductionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<MixcutJobData>): Promise<any> {
    const { jobId, userId, inputConfig, editingConfig, outputConfig, videoCount } = job.data;
    this.logger.log(`Processing mixcut job ${jobId}: ${videoCount} videos`);

    try {
      await this.updateJobStatus(jobId, 'PROCESSING');
      this.sendProgress(userId, jobId, 'PROCESSING', 5, '正在提交智能混剪任务到 IMS');

      const imsProvider = this.providers.batchComposeProvider;

      // Submit directly to IMS — no TTS/S2V pipeline
      const callbackBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '';
      const callbackUrl = callbackBase ? `${callbackBase}/api/callbacks/ims` : undefined;
      const callbackToken = process.env.IMS_CALLBACK_TOKEN || '';

      const imsResult = await imsProvider.submitBatchJob(
        inputConfig,
        editingConfig,
        outputConfig,
        callbackUrl,
        callbackToken || undefined,
      );
      this.logger.log(`IMS mixcut job submitted: ${imsResult.jobId}`);

      // Persist IMS job ID immediately
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          externalId: imsResult.jobId,
          output: { imsJobId: imsResult.jobId },
        },
      });

      this.sendProgress(userId, jobId, 'PROCESSING', 15, `IMS 任务已提交: ${imsResult.jobId}`);

      // Detect preview mode from outputConfig
      const isPreviewOnly = outputConfig?.GeneratePreviewOnly === true;

      // Poll IMS status
      let imsStatus = await this.pollImsJob(imsResult.jobId, userId, jobId);

      // Extract output videos from successful sub-jobs
      let outputVideos = (imsStatus.subJobs || [])
        .filter((sj: any) => sj.status === 'Success')
        .map((sj: any) => ({
          mediaId: sj.mediaId,
          mediaURL: sj.mediaURL,
          duration: sj.duration,
        }));

      // Re-poll with retry — sub-job statuses can lag behind the main job 'Finished' status
      if (outputVideos.length === 0 && (imsStatus.subJobs || []).length > 0) {
        this.logger.warn(
          `Mixcut ${jobId}: main job Finished but 0 Success sub-jobs. ` +
          `Statuses: ${(imsStatus.subJobs || []).map((sj: any) => sj.status).join(', ')}. Retrying...`,
        );
        for (let retry = 0; retry < 3; retry++) {
          await new Promise((r) => setTimeout(r, 3000 * (retry + 1)));
          imsStatus = await imsProvider.checkJobStatus(imsResult.jobId);
          outputVideos = (imsStatus.subJobs || [])
            .filter((sj: any) => sj.status === 'Success')
            .map((sj: any) => ({
              mediaId: sj.mediaId,
              mediaURL: sj.mediaURL,
              duration: sj.duration,
            }));
          this.logger.log(`Mixcut ${jobId}: re-poll #${retry + 1}, ${outputVideos.length} Success sub-jobs`);
          if (outputVideos.length > 0) break;
        }
      }

      // Fallback: if still 0, include any sub-job that has a mediaURL
      if (outputVideos.length === 0) {
        outputVideos = (imsStatus.subJobs || [])
          .filter((sj: any) => sj.mediaURL)
          .map((sj: any) => ({
            mediaId: sj.mediaId,
            mediaURL: sj.mediaURL,
            duration: sj.duration,
          }));
        if (outputVideos.length > 0) {
          this.logger.warn(`Mixcut ${jobId}: fallback to mediaURL filter, found ${outputVideos.length} videos`);
        }
      }

      this.logger.log(
        `Mixcut ${jobId} finished: ${outputVideos.length}/${(imsStatus.subJobs || []).length} videos. ` +
        `Statuses: ${(imsStatus.subJobs || []).map((sj: any) => `${sj.status}[${sj.mediaURL ? 'url' : 'no-url'}]`).join(', ')}`,
      );

      // Update final status
      const output = {
        imsJobId: imsResult.jobId,
        imsStatus,
        outputVideos,
        isPreviewOnly,
      };

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output,
        },
      });

      const message = isPreviewOnly
        ? '快速预览完成（预览模式不生成视频文件）'
        : `智能混剪完成，生成 ${outputVideos.length} 个视频`;

      this.ws.sendToUser(userId, 'mixcut:progress', {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        message,
        outputVideos,
        isPreviewOnly,
      });
      return output;
    } catch (error: any) {
      this.logger.error(`Mixcut job ${jobId} failed: ${error.message}`, error.stack);

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMsg: error.message,
        },
      });

      this.sendProgress(userId, jobId, 'FAILED', 0, error.message);

      // Refund credits
      try {
        const gen = await this.prisma.generation.findUnique({ where: { id: jobId } });
        if (gen?.creditsUsed) {
          await this.userService.addCredits(
            userId,
            gen.creditsUsed,
            'REFUND',
            `退款: 智能混剪失败 - ${error.message.slice(0, 100)}`,
            jobId,
          );
        }
      } catch (refundErr: any) {
        this.logger.error(`Refund failed for ${jobId}: ${refundErr.message}`);
      }

      throw error;
    }
  }

  private async pollImsJob(imsJobId: string, userId: string, jobId: string): Promise<any> {
    const maxDurationMs = 60 * 60 * 1000; // 60 minutes max
    const startTime = Date.now();
    const imsProvider = this.providers.batchComposeProvider;
    let lastProgress = 0;
    let attempt = 0;

    while (Date.now() - startTime < maxDurationMs) {
      // Adaptive interval: 15s early, 8s mid, 5s near completion
      const interval = lastProgress < 30 ? 15000 : lastProgress < 70 ? 8000 : 5000;
      await new Promise((r) => setTimeout(r, interval));
      attempt++;

      // Check if callback already completed this job
      if (attempt % 6 === 0) {
        const gen = await this.prisma.generation.findUnique({ where: { id: jobId }, select: { status: true } });
        if (gen?.status === 'COMPLETED' || gen?.status === 'FAILED') {
          this.logger.log(`Mixcut ${jobId}: callback already resolved to ${gen.status}, stopping poll`);
          return await imsProvider.checkJobStatus(imsJobId);
        }
      }

      // Heartbeat log every 10 attempts
      if (attempt % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.logger.log(`Mixcut ${jobId} polling: attempt=${attempt}, elapsed=${elapsed}s, progress=${lastProgress}%`);
      }

      try {
        const status = await imsProvider.checkJobStatus(imsJobId);

        if (status.status === 'Finished') {
          this.sendProgress(userId, jobId, 'PROCESSING', 95, 'IMS 成片完成');
          return status;
        }
        if (status.status === 'Failed') {
          const detail = status.errorDetail || status.subJobs?.filter((s: any) => s.status === 'Failed').map((s: any) => `${s.errorCode}: ${s.errorMessage}`).join('; ') || 'unknown';
          throw new Error(`IMS 智能混剪任务失败: ${detail}`);
        }

        lastProgress = status.progress || 0;
        const progress = 15 + Math.round(lastProgress * 0.8);
        this.sendProgress(userId, jobId, 'PROCESSING', Math.min(progress, 94), `IMS 处理中: ${lastProgress}%`);
      } catch (err: any) {
        if (err.message.includes('失败')) throw err;
        this.logger.warn(`IMS poll error: ${err.message}`);
      }
    }

    throw new Error('IMS 任务超时 (60分钟)');
  }

  private sendProgress(userId: string, jobId: string, status: string, progress: number, message: string) {
    this.ws.sendToUser(userId, 'mixcut:progress', { jobId, status, progress, message });
  }

  private async updateJobStatus(jobId: string, status: string) {
    await this.prisma.generation.update({
      where: { id: jobId },
      data: { status: status as any },
    });
  }
}
