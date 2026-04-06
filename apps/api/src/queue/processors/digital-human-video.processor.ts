import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { StorageService } from '../../storage/storage.service';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';
import { pollTaskStatus } from './poll-helper';

interface DHVideoJobData {
  jobId: string;
  userId: string;
  input: {
    engine?: 'ims' | 'wan-photo' | 'wan-motion';
    avatarUrl?: string;
    builtinAvatarId?: string;
    voiceType?: 'builtin' | 'cloned';
    driveMode: 'text' | 'audio' | 'video';
    resolution: string;
    voiceId?: string;
    outputFormat?: 'mp4' | 'webm';
    text?: string;
    speechRate?: number;
    loopMotion?: boolean;
    pitchRate?: number;
    volume?: number;
    backgroundUrl?: string;
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
    private readonly storage: StorageService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<DHVideoJobData>): Promise<any> {
    const { jobId, userId, input } = job.data;
    const resolvedEngine = this.resolveEngine(input);
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
      if (resolvedEngine === 'ims') {
        if (!input.builtinAvatarId) throw new Error('缺少内置数字人');

        const imsProvider = this.providers.imsProvider;
        const avatarInputConfig = input.driveMode === 'text'
          ? { Text: input.text }
          : { InputFile: input.audioUrl };
        const avatarOutputConfig = this.buildImsAvatarOutputConfig(jobId, input.outputFormat);

        const avatarEditingConfig = imsProvider.buildAvatarEditingConfig({
          avatarId: input.builtinAvatarId,
          ...(input.voiceId && input.driveMode === 'text'
            ? input.voiceType === 'cloned'
              ? { customizedVoice: input.voiceId }
              : { voice: input.voiceId }
            : {}),
          ...(input.speechRate !== undefined && input.driveMode === 'text'
            ? { uiSpeechRate: input.speechRate }
            : {}),
          ...(input.loopMotion !== undefined && { loopMotion: input.loopMotion }),
          ...(input.pitchRate !== undefined && { pitchRate: input.pitchRate }),
          ...(input.volume !== undefined && { volume: input.volume }),
          ...(input.backgroundUrl && { backgroundUrl: input.backgroundUrl }),
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress: 15,
          message: '正在提交 IMS 数字人渲染任务...',
        });

        const submitResult = await imsProvider.submitAvatarVideoJob(
          avatarInputConfig,
          avatarEditingConfig,
          avatarOutputConfig,
        );

        if (!submitResult.jobId) {
          throw new Error('IMS 数字人渲染提交失败：未返回任务ID');
        }

        await this.prisma.generation.update({
          where: { id: jobId },
          data: { externalId: submitResult.jobId },
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress: 30,
          message: '正在等待 IMS 数字人合成完成...',
        });

        const videoResult = await this.pollImsCompletion(
          imsProvider,
          submitResult.jobId,
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
              ...(videoResult.mediaId || submitResult.mediaId
                ? { mediaId: videoResult.mediaId || submitResult.mediaId }
                : {}),
              ...(videoResult.maskUrl ? { maskUrl: videoResult.maskUrl } : {}),
              ...(videoResult.subtitleClips ? { subtitleClips: videoResult.subtitleClips } : {}),
              externalJobType: 'ims-avatar',
              jobId: submitResult.jobId,
            },
          },
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          message: 'IMS 数字人视频生成完成',
          output: { videoUrl: videoResult.videoUrl },
        });

        this.logger.log(`IMS avatar video completed: ${jobId}`);
        return videoResult;
      }

      // Video drive mode: use wan2.2-animate-move (image + reference video)
      if (resolvedEngine === 'wan-motion') {
        if (!input.videoUrl) throw new Error('缺少参考视频');
        if (!input.avatarUrl) throw new Error('缺少数字人形象');

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
          {
            progressMessage: '动作迁移视频生成中...',
            errorPrefix: '动作迁移视频生成失败',
            timeoutMessage: '动作迁移视频生成超时（15分钟）',
          },
        );

        await this.prisma.generation.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: {
              videoUrl: videoResult.videoUrl,
              externalJobType: 'wan-animate',
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
      if (resolvedEngine === 'wan-photo' && input.driveMode === 'text' && input.voiceId && input.text) {
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
      if (!input.avatarUrl) {
        throw new Error('缺少数字人形象');
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
            externalJobType: 'wan-s2v',
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

  private resolveEngine(input: DHVideoJobData['input']): 'ims' | 'wan-photo' | 'wan-motion' {
    if (input.engine) {
      return input.engine;
    }

    return input.driveMode === 'video' ? 'wan-motion' : 'wan-photo';
  }

  private async pollVideoCompletion(
    provider: any,
    taskId: string,
    userId: string,
    jobId: string,
    options?: {
      progressMessage?: string;
      errorPrefix?: string;
      timeoutMessage?: string;
    },
  ): Promise<{ videoUrl: string }> {
    return pollTaskStatus(taskId, {
      interval: 5000,
      maxAttempts: 180,
      checkStatus: (tid) => provider.checkTaskStatus(tid),
      normalizeStatus: (s) => (s.status || '').toUpperCase(),
      extractResult: (s) => {
        if (!s.videoUrl) throw new Error('视频生成完成但未返回视频地址');
        return { videoUrl: s.videoUrl };
      },
      extractError: (s) =>
        `${options?.errorPrefix || 'S2V 视频生成失败'}: ${s.errorMessage || s.message || '未知错误'}`,
      ws: this.ws,
      userId,
      jobId,
      wsEvent: 'digital-human:progress',
      progressInterval: 6,
      buildProgressMessage: (i, max) => ({
        progress: Math.min(30 + Math.round((i / max) * 65), 95),
        message: `${options?.progressMessage || '数字人视频生成中...'} (${Math.round((i * 5) / 60)}分钟)`,
      }),
      logger: this.logger,
      timeoutMessage: options?.timeoutMessage || '数字人视频生成超时（15分钟）',
    });
  }

  private async pollImsCompletion(
    provider: any,
    jobId: string,
    userId: string,
    generationId: string,
  ): Promise<{
    videoUrl: string;
    mediaId?: string;
    maskUrl?: string;
    subtitleClips?: any[];
  }> {
    return pollTaskStatus(jobId, {
      interval: 5000,
      maxAttempts: 180,
      checkStatus: (imsJobId) => provider.getSmartHandleJob(imsJobId),
      normalizeStatus: (status) => {
        const normalized = (status.status || '').toUpperCase();
        if (normalized === 'FINISHED' || normalized === 'SUCCESS') {
          return 'COMPLETED';
        }
        if (normalized === 'FAIL') {
          return 'FAILED';
        }
        return normalized;
      },
      extractResult: (status) => {
        if (!status.videoUrl) throw new Error('IMS 数字人合成完成但未返回视频地址');
        return {
          videoUrl: status.videoUrl,
          ...(status.mediaId ? { mediaId: status.mediaId } : {}),
          ...(status.maskUrl ? { maskUrl: status.maskUrl } : {}),
          ...(status.subtitleClips ? { subtitleClips: status.subtitleClips } : {}),
        };
      },
      extractError: (status) =>
        `IMS 数字人渲染失败: ${status.errorMessage || status.errorCode || status.message || '未知错误'}`,
      ws: this.ws,
      userId,
      jobId: generationId,
      wsEvent: 'digital-human:progress',
      progressInterval: 6,
      buildProgressMessage: (attempt, maxAttempts) => ({
        progress: Math.min(30 + Math.round((attempt / maxAttempts) * 65), 95),
        message: `正在等待 IMS 数字人合成完成... (${Math.round((attempt * 5) / 60)}分钟)`,
      }),
      logger: this.logger,
      timeoutMessage: 'IMS 数字人合成超时（15分钟）',
    });
  }

  private buildImsAvatarOutputConfig(
    generationId: string,
    outputFormat: DHVideoJobData['input']['outputFormat'] = 'mp4',
  ) {
    const outputKey = this.storage.generateKey('digital-human/ims', `${generationId}.${outputFormat}`);

    return {
      MediaURL: this.storage.getOssUrl(outputKey),
    };
  }
}
