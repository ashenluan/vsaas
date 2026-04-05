import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';

interface DHVideoJobData {
  jobId: string;
  userId: string;
  input: {
    avatarUrl: string;
    driveMode: 'text' | 'audio' | 'video';
    resolution: string;
    voiceId?: string;
    text?: string;
    audioUrl?: string;
    videoUrl?: string;
    animateMode?: 'wan-std' | 'wan-pro';
  };
}

@Processor('digital-human-video', { concurrency: 3 })
export class DigitalHumanVideoProcessor extends WorkerHost {
  private readonly logger = new Logger(DigitalHumanVideoProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<DHVideoJobData>): Promise<any> {
    const { jobId, userId, input } = job.data;
    this.logger.log(`Processing digital human video ${jobId}`);

    await this.prisma.generation.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    this.ws.sendToUser(userId, 'digital-human:progress', {
      jobId,
      status: 'PROCESSING',
      progress: 5,
      message: '开始处理...',
    });

    try {
      // Video drive mode: use wan2.2-animate-move (image + reference video)
      if (input.driveMode === 'video') {
        if (!input.videoUrl) throw new Error('缺少参考视频');

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress: 20,
          message: '正在生成动作迁移视频...',
        });

        const dhProvider = this.providers.digitalHumanProvider;
        const genResult = await dhProvider.generateAnimateVideo(
          input.avatarUrl,
          input.videoUrl,
          input.animateMode || 'wan-std',
        );

        if (!genResult.taskId) {
          throw new Error('动作迁移视频生成失败：未返回任务ID');
        }

        await this.prisma.generation.update({
          where: { id: jobId },
          data: { externalId: genResult.taskId },
        });

        const videoResult = await this.pollVideoCompletion(
          dhProvider,
          genResult.taskId,
          userId,
          jobId,
        );

        await this.prisma.generation.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: {
              videoUrl: videoResult.videoUrl,
              taskId: genResult.taskId,
            },
          },
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          message: '动作迁移视频生成完成',
          output: { videoUrl: videoResult.videoUrl },
        });

        this.logger.log(`Animate-move video completed: ${jobId}`);
        return videoResult;
      }

      let audioUrl = input.audioUrl;

      // Step 1: TTS if text drive mode
      if (input.driveMode === 'text' && input.voiceId && input.text) {
        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress: 10,
          message: '正在合成语音...',
        });

        const voiceProvider = this.providers.voiceProvider;
        const ttsResult = await voiceProvider.synthesizeSpeech(input.text, input.voiceId);
        audioUrl = ttsResult.audioUrl;

        if (!audioUrl) {
          throw new Error('TTS 语音合成失败：未返回音频地址');
        }

        this.logger.log(`TTS completed for job ${jobId}: ${audioUrl.slice(0, 80)}`);
      }

      if (!audioUrl) {
        throw new Error('缺少音频文件');
      }

      // Step 2: Generate S2V video
      this.ws.sendToUser(userId, 'digital-human:progress', {
        jobId,
        status: 'PROCESSING',
        progress: 30,
        message: '正在生成数字人视频...',
      });

      const dhProvider = this.providers.digitalHumanProvider;
      const resolutionMap: Record<string, string> = {
        '1080x1920': '1080P',
        '1920x1080': '1080P',
        '1080x1080': '720P',
      };
      const s2vResolution = resolutionMap[input.resolution] || '720P';

      const genResult = await dhProvider.generateVideo(
        input.avatarUrl,
        audioUrl,
        s2vResolution,
      );

      if (!genResult.taskId) {
        throw new Error('S2V 视频生成失败：未返回任务ID');
      }

      // Save externalId
      await this.prisma.generation.update({
        where: { id: jobId },
        data: { externalId: genResult.taskId },
      });

      // Step 3: Poll for completion
      const videoResult = await this.pollVideoCompletion(
        dhProvider,
        genResult.taskId,
        userId,
        jobId,
      );

      // Step 4: Complete
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output: {
            videoUrl: videoResult.videoUrl,
            audioUrl,
            taskId: genResult.taskId,
          },
        },
      });

      this.ws.sendToUser(userId, 'digital-human:progress', {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        message: '数字人视频生成完成',
        output: { videoUrl: videoResult.videoUrl },
      });

      this.logger.log(`Digital human video completed: ${jobId}`);
      return videoResult;
    } catch (error: any) {
      this.logger.error(`Digital human video ${jobId} failed: ${error.message}`);

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMsg: error.message,
        },
      });

      this.ws.sendToUser(userId, 'digital-human:progress', {
        jobId,
        status: 'FAILED',
        progress: 0,
        message: `生成失败: ${error.message}`,
      });

      // Refund credits
      try {
        const gen = await this.prisma.generation.findUnique({ where: { id: jobId } });
        if (gen?.creditsUsed) {
          await this.userService.addCredits(
            userId,
            gen.creditsUsed,
            'REFUND',
            `退款: 数字人视频生成失败 - ${error.message.slice(0, 100)}`,
            jobId,
          );
        }
      } catch (refundErr: any) {
        this.logger.error(`Refund failed for ${jobId}: ${refundErr.message}`);
      }

      throw error;
    }
  }

  private async pollVideoCompletion(
    provider: any,
    taskId: string,
    userId: string,
    jobId: string,
  ): Promise<{ videoUrl: string }> {
    const maxAttempts = 180; // 15 minutes
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      const status = await provider.checkTaskStatus(taskId);
      const normalizedStatus = (status.status || '').toUpperCase();

      if (normalizedStatus === 'SUCCEEDED') {
        if (!status.videoUrl) {
          throw new Error('视频生成完成但未返回视频地址');
        }
        return { videoUrl: status.videoUrl };
      }

      if (normalizedStatus === 'FAILED') {
        throw new Error(`S2V 视频生成失败: ${status.errorMessage || status.message || '未知错误'}`);
      }
      if (normalizedStatus === 'CANCELED') {
        throw new Error('S2V 视频生成任务已被取消');
      }
      if (normalizedStatus === 'UNKNOWN') {
        throw new Error('S2V 任务已过期或不存在，请重新提交');
      }

      // Send progress updates every 30s
      if (i > 0 && i % 6 === 0) {
        const progress = Math.min(30 + Math.round((i / maxAttempts) * 65), 95);
        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress,
          message: `数字人视频生成中... (${Math.round((i * 5) / 60)}分钟)`,
        });
      }
    }

    throw new Error('数字人视频生成超时（15分钟）');
  }
}
