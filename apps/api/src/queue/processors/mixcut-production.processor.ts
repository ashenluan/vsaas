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

      // Poll IMS status
      const imsStatus = await this.pollImsJob(imsResult.jobId, userId, jobId);

      // Extract output videos from successful sub-jobs
      const outputVideos = (imsStatus.subJobs || [])
        .filter((sj: any) => sj.status === 'Success')
        .map((sj: any) => ({
          mediaId: sj.mediaId,
          mediaURL: sj.mediaURL,
          duration: sj.duration,
        }));

      // Update final status
      const output = {
        imsJobId: imsResult.jobId,
        imsStatus,
        outputVideos,
      };

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output,
        },
      });

      this.ws.sendToUser(userId, 'mixcut:progress', {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        message: `智能混剪完成，生成 ${outputVideos.length} 个视频`,
        outputVideos,
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
    const maxAttempts = 360; // 360 * 10s = 60 minutes max
    const interval = 10000;
    const imsProvider = this.providers.batchComposeProvider;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, interval));

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

        const progress = 15 + Math.round((status.progress || 0) * 0.8);
        this.sendProgress(userId, jobId, 'PROCESSING', Math.min(progress, 94), `IMS 处理中: ${status.progress || 0}%`);
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
