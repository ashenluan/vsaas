import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { StorageService } from '../../storage/storage.service';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';
import { normalizeDigitalHumanVideoResult } from './digital-human-result-normalizer';
import { pollTaskStatus } from './poll-helper';

interface DHVideoJobData {
  jobId: string;
  userId: string;
  input: {
    engine?: 'ims' | 'wan-photo' | 'wan-motion' | 'videoretalk';
    avatarUrl?: string;
    builtinAvatarId?: string;
    preset?: 'speed' | 'balanced' | 'quality';
    resolvedModel?: string;
    resolvedConstraints?: {
      requestedResolution: string;
      outputResolution: string;
      outputResolutionMode: 'requested' | 'source' | 'profile';
      providerResolution?: string;
      sourceVideoRequired?: boolean;
    };
    preflight?: {
      status: 'passed' | 'warning';
      warnings?: string[];
    };
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
    refImageUrl?: string;
    videoExtension?: boolean;
    queryFaceThreshold?: number;
    animateMode?: 'wan-std' | 'wan-pro';
  };
}

@Processor('digital-human-video', { concurrency: 1 })
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
        const signedVideoUrl = this.storage.ensureSignedUrl(videoResult.videoUrl);
        const signedMaskUrl = videoResult.maskUrl
          ? this.storage.ensureSignedUrl(videoResult.maskUrl)
          : undefined;

        await this.prisma.generation.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: {
              videoUrl: signedVideoUrl,
              ...(videoResult.mediaId || submitResult.mediaId
                ? { mediaId: videoResult.mediaId || submitResult.mediaId }
                : {}),
              ...(signedMaskUrl ? { maskUrl: signedMaskUrl } : {}),
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
          output: { videoUrl: signedVideoUrl },
        });

        this.logger.log(`IMS avatar video completed: ${jobId}`);
        return {
          ...videoResult,
          videoUrl: signedVideoUrl,
          ...(signedMaskUrl ? { maskUrl: signedMaskUrl } : {}),
        };
      }

      if (resolvedEngine === 'videoretalk') {
        if (!input.videoUrl) throw new Error('缺少源视频');
        if (!input.audioUrl) throw new Error('缺少音频文件');

        const retalkProvider = this.providers.videoRetalkProvider;

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'PROCESSING',
          progress: 20,
          message: '正在提交 VideoRetalk 重驱动任务...',
        });

        const submitResult = await retalkProvider.submitVideoRetalkJob({
          videoUrl: input.videoUrl,
          audioUrl: input.audioUrl,
          refImageUrl: input.refImageUrl,
          videoExtension: input.videoExtension,
          queryFaceThreshold: input.queryFaceThreshold,
        });

        if (!submitResult.taskId) {
          throw new Error('VideoRetalk 提交失败：未返回任务ID');
        }

        await this.prisma.generation.update({
          where: { id: jobId },
          data: { externalId: submitResult.taskId },
        });

        const videoResult = await this.pollVideoCompletion(
          retalkProvider,
          submitResult.taskId,
          userId,
          jobId,
          {
            progressMessage: 'VideoRetalk 重驱动中...',
            errorPrefix: 'VideoRetalk 重驱动失败',
            timeoutMessage: 'VideoRetalk 重驱动超时（25分钟）',
            maxAttempts: 300,
            extractResult: (status) => ({
              videoUrl: status.videoUrl,
              requestId: status.requestId,
              usage: status.usage,
            }),
          },
        );

        const normalized = await normalizeDigitalHumanVideoResult(this.storage, {
          engine: 'videoretalk',
          providerTempUrl: videoResult.videoUrl,
          providerTaskId: submitResult.taskId,
          providerRequestId: videoResult.requestId || submitResult.requestId,
          externalJobType: 'videoretalk',
          resolvedModel: input.resolvedModel || 'videoretalk',
          audioUrl: input.audioUrl,
          usage: videoResult.usage,
          warnings: input.preflight?.warnings,
          fallbackSuggested: this.buildFallbackSuggestion(input),
        });

        await this.prisma.generation.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: normalized.output,
          },
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          message: 'VideoRetalk 重驱动完成',
          output: { videoUrl: normalized.videoUrl },
        });

        this.logger.log(`VideoRetalk video completed: ${jobId}`);
        return {
          videoUrl: normalized.videoUrl,
          requestId: videoResult.requestId || submitResult.requestId,
          usage: videoResult.usage,
        };
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
            timeoutMessage: '动作迁移视频生成超时（20分钟）',
            maxAttempts: 240,
          },
        );

        const normalized = await normalizeDigitalHumanVideoResult(this.storage, {
          engine: 'wan-motion',
          providerTempUrl: videoResult.videoUrl,
          providerTaskId: genResult.taskId,
          externalJobType: 'wan-animate',
          resolvedModel: input.resolvedModel || 'wan2.2-animate-move',
          warnings: input.preflight?.warnings,
          fallbackSuggested: this.buildFallbackSuggestion(input),
        });

        await this.prisma.generation.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: normalized.output,
          },
        });

        this.ws.sendToUser(userId, 'digital-human:progress', {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          message: '动作迁移视频生成完成',
          output: { videoUrl: normalized.videoUrl },
        });

        this.logger.log(`Animate-move video completed: ${jobId}`);
        return { videoUrl: normalized.videoUrl };
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
        const ttsResult = await voiceProvider.synthesizeSpeech(input.text, input.voiceId, {
          ...(input.speechRate !== undefined && { speechRate: input.speechRate }),
          ...(input.pitchRate !== undefined && { pitchRate: input.pitchRate }),
          ...(input.volume !== undefined && { volume: input.volume }),
        });
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
        message: '照片口播合成中...',
      });

      const dhProvider = this.providers.digitalHumanProvider;
      const s2vResolution = this.resolveWanPhotoResolution(input);

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
        {
          progressMessage: '照片口播合成中...',
          errorPrefix: '照片口播合成失败',
          timeoutMessage: '照片口播合成超时（20分钟）',
          maxAttempts: 240,
        },
      );

      const normalized = await normalizeDigitalHumanVideoResult(this.storage, {
        engine: 'wan-photo',
        providerTempUrl: videoResult.videoUrl,
        providerTaskId: genResult.taskId,
        externalJobType: 'wan-s2v',
        resolvedModel: input.resolvedModel || 'wan2.2-s2v',
        audioUrl,
        warnings: input.preflight?.warnings,
        fallbackSuggested: this.buildFallbackSuggestion(input),
      });

      // Step 4: Complete
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output: normalized.output,
        },
      });

      this.ws.sendToUser(userId, 'digital-human:progress', {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        message: '照片口播合成完成',
        output: { videoUrl: normalized.videoUrl },
      });

      this.logger.log(`Digital human video completed: ${jobId}`);
      return { videoUrl: normalized.videoUrl };
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

  private resolveEngine(input: DHVideoJobData['input']): 'ims' | 'wan-photo' | 'wan-motion' | 'videoretalk' {
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
      maxAttempts?: number;
      extractResult?: (status: any) => any;
    },
  ): Promise<any> {
    return pollTaskStatus(taskId, {
      interval: 5000,
      maxAttempts: options?.maxAttempts || 180,
      checkStatus: (tid) => provider.checkTaskStatus(tid),
      normalizeStatus: (s) => (s.status || '').toUpperCase(),
      extractResult: options?.extractResult || ((s) => {
        if (!s.videoUrl) throw new Error('视频生成完成但未返回视频地址');
        return { videoUrl: s.videoUrl };
      }),
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

  private resolveWanPhotoResolution(input: DHVideoJobData['input']) {
    const providerResolution = input.resolvedConstraints?.providerResolution;
    if (providerResolution) {
      return providerResolution;
    }

    const resolutionMap: Record<string, string> = {
      '1080x1920': '1080P',
      '1920x1080': '1080P',
      '1080x1080': '720P',
    };

    const resolved = resolutionMap[input.resolution];
    if (!resolved) {
      throw new Error(`当前分辨率暂不支持万相照片口播: ${input.resolution}`);
    }
    return resolved;
  }

  private buildFallbackSuggestion(input: DHVideoJobData['input']) {
    if (input.engine === 'videoretalk' && !input.refImageUrl) {
      return '如果素材只是静态人像照片，建议改用“照片开口说话”获得更稳的结果';
    }

    if (input.engine === 'wan-photo') {
      return '如果你需要复刻原视频中的动作或表情，建议改用“动作迁移”或“已有视频重驱动”';
    }

    return undefined;
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
    const requiredOssRegion =
      typeof this.providers.imsProvider?.getRequiredOssRegion === 'function'
        ? this.providers.imsProvider.getRequiredOssRegion()
        : undefined;

    if (requiredOssRegion && this.storage.getRegion() !== requiredOssRegion) {
      throw new Error(
        `IMS 输出存储区域与服务区域不一致，请将 OSS_REGION 配置为 ${requiredOssRegion} 后重试`,
      );
    }

    const outputKey = this.storage.generateKey('digital-human/ims', `${generationId}.${outputFormat}`);

    return {
      MediaURL: this.storage.getOssUrl(outputKey),
    };
  }
}
