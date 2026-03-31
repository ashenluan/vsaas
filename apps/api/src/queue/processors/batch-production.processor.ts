import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { StorageService } from '../../storage/storage.service';
import { WsGateway } from '../../ws/ws.gateway';

interface ComposeJobData {
  jobId: string;
  userId: string;
  input: {
    voiceId: string;
    avatarId: string;
    avatarUrl: string;
    scripts: { id: string; title: string; content: string }[];
    materials: { id: string; name: string; type: string; url: string }[];
    bgMusic?: string;
    videoCount: number;
    resolution: string;
    subtitleConfig?: any;
    titleConfig?: any;
    effectsConfig?: any;
    transitionConfig?: any;
    filterConfig?: any;
    highlightWords?: { word: string; fontColor?: string; outlineColour?: string; bold?: boolean }[];
    maxDuration?: number;
    crf?: number;
    speechRate?: number;
    mediaVolume?: number;
    speechVolume?: number;
    bgMusicVolume?: number;
  };
}

interface PipelineStep {
  scriptId: string;
  scriptTitle: string;
  ttsTaskId?: string;
  ttsAudioUrl?: string;
  s2vTaskId?: string;
  s2vVideoUrl?: string;
  status: 'pending' | 'tts' | 'tts_done' | 's2v' | 's2v_done' | 'failed';
  error?: string;
}

@Processor('batch-production', { concurrency: 2 })
export class BatchProductionProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchProductionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<ComposeJobData>): Promise<any> {
    const { jobId, userId, input } = job.data;
    this.logger.log(`Processing batch production ${jobId}: ${input.scripts.length} scripts, ${input.videoCount} videos`);

    // 跟踪已部分退款金额，防止 catch 块全额退款时超额
    let partialRefundedAmount = 0;

    try {
      await this.updateJobStatus(jobId, 'PROCESSING');
      this.sendProgress(userId, jobId, 'PROCESSING', 0, '开始处理批量混剪任务');

      // Phase 1: TTS for each script using cloned voice
      const steps: PipelineStep[] = input.scripts.map((s) => ({
        scriptId: s.id,
        scriptTitle: s.title,
        status: 'pending' as const,
      }));

      this.sendProgress(userId, jobId, 'PROCESSING', 5, `开始语音合成 (${steps.length} 个脚本)`);

      // TTS all scripts with concurrency limit
      const TTS_CONCURRENCY = 3;
      for (let i = 0; i < steps.length; i += TTS_CONCURRENCY) {
        const batch = steps.slice(i, i + TTS_CONCURRENCY);
        const scriptBatch = input.scripts.slice(i, i + TTS_CONCURRENCY);

        await Promise.all(
          batch.map(async (step, idx) => {
            try {
              step.status = 'tts';
              const script = scriptBatch[idx];

              this.logger.log(`TTS for script ${step.scriptId}: ${script.content.slice(0, 50)}...`);
              const voiceProvider = this.providers.voiceProvider;
              const ttsResult = await voiceProvider.synthesizeSpeech(script.content, input.voiceId);

              step.ttsAudioUrl = ttsResult.audioUrl;
              step.status = 'tts_done';
              this.logger.log(`TTS completed for script ${step.scriptId}: ${ttsResult.audioUrl}`);
            } catch (error: any) {
              step.status = 'failed';
              step.error = `TTS failed: ${error.message}`;
              this.logger.error(`TTS failed for script ${step.scriptId}: ${error.message}`);
            }
          }),
        );

        const ttsCompleted = steps.filter((s) => s.status === 'tts_done' || s.status === 'failed').length;
        const ttsProgress = 5 + Math.round((ttsCompleted / steps.length) * 25);
        this.sendProgress(userId, jobId, 'PROCESSING', ttsProgress, `语音合成进度: ${ttsCompleted}/${steps.length}`);
      }

      const ttsSuccessful = steps.filter((s) => s.status === 'tts_done');
      if (ttsSuccessful.length === 0) {
        throw new Error('所有脚本的语音合成都失败了');
      }

      // Phase 2: S2V - Generate digital human videos
      this.sendProgress(userId, jobId, 'PROCESSING', 30, `开始数字人视频生成 (${ttsSuccessful.length} 个)`);

      const S2V_CONCURRENCY = 2;
      for (let i = 0; i < ttsSuccessful.length; i += S2V_CONCURRENCY) {
        const batch = ttsSuccessful.slice(i, i + S2V_CONCURRENCY);

        // Submit S2V tasks
        await Promise.all(
          batch.map(async (step) => {
            try {
              step.status = 's2v';
              const dhProvider = this.providers.digitalHumanProvider;
              const result = await dhProvider.generateVideo(
                input.avatarUrl,
                step.ttsAudioUrl!,
                this.parseResolution(input.resolution),
              );
              step.s2vTaskId = result.taskId;
              // 记录 S2V 实际使用的分辨率
              (step as any).s2vResolution = this.parseResolution(input.resolution);
              this.logger.log(`S2V task submitted for script ${step.scriptId}: ${result.taskId}`);
            } catch (error: any) {
              step.status = 'failed';
              step.error = `S2V submit failed: ${error.message}`;
              this.logger.error(`S2V submit failed for script ${step.scriptId}: ${error.message}`);
            }
          }),
        );

        // Poll for S2V completion
        const pendingS2v = batch.filter((s) => s.s2vTaskId && s.status === 's2v');
        await this.pollS2vTasks(pendingS2v, userId, jobId, steps);
      }

      const s2vSuccessful = steps.filter((s) => s.status === 's2v_done');
      if (s2vSuccessful.length === 0) {
        throw new Error('所有数字人视频生成都失败了');
      }

      // 根据 S2V 实际成功数量调整 IMS videoCount
      // 避免素材不足导致 IMS 生成低质量或重复视频
      const actualVideoCount = Math.min(input.videoCount, s2vSuccessful.length);
      if (actualVideoCount < input.videoCount) {
        this.logger.warn(
          `S2V partial failure: ${s2vSuccessful.length}/${steps.length} succeeded, adjusting videoCount from ${input.videoCount} to ${actualVideoCount}`,
        );
        this.sendProgress(userId, jobId, 'PROCESSING', 68,
          `部分脚本视频生成失败 (${s2vSuccessful.length}/${steps.length})，将生成 ${actualVideoCount} 条视频`,
        );

        // 部分退款：退还减少的视频数量对应的积分
        const costPerVideo = 20;
        const refundAmount = (input.videoCount - actualVideoCount) * costPerVideo;
        if (refundAmount > 0) {
          try {
            await this.userService.addCredits(
              userId,
              refundAmount,
              'REFUND',
              `部分退款: S2V 部分失败，减少 ${input.videoCount - actualVideoCount} 条视频`,
              jobId,
            );
            this.logger.log(`Partial refund of ${refundAmount} credits for job ${jobId}`);
            partialRefundedAmount = refundAmount;

            // 更新 DB 中 creditsUsed 为实际消耗金额
            await this.prisma.generation.update({
              where: { id: jobId },
              data: { creditsUsed: actualVideoCount * costPerVideo },
            });
          } catch (refundErr: any) {
            this.logger.error(`Partial refund failed for ${jobId}: ${refundErr.message}`);
          }
        }
      }

      // Phase 3: IMS Batch Compose
      this.sendProgress(userId, jobId, 'PROCESSING', 70, '开始批量成片合成');

      const imsProvider = this.providers.batchComposeProvider;

      // Build IMS configs
      // S2V 视频已包含 TTS 语音，不再传 speechTexts 避免双重语音
      const mediaUrls = [
        ...s2vSuccessful.map((s) => s.s2vVideoUrl!),
        ...input.materials.map((m) => m.url),
      ];

      const inputConfig = imsProvider.buildInputConfig({
        mode: 'global',
        mediaGroups: [{
          groupName: 'main',
          mediaUrls,
          // 不传 speechTexts — S2V 视频自带口播音频
        }],
        ...(input.bgMusic && { backgroundMusic: [input.bgMusic] }),
        ...(input.titleConfig?.titles?.length && { titles: input.titleConfig.titles }),
      });

      const { width, height } = this.parseResolutionWH(input.resolution);

      const editingConfig = imsProvider.buildEditingConfig({
        // 不传 customizedVoice — S2V 视频已包含克隆声音的 TTS
        mediaVolume: input.mediaVolume ?? 1, // 保留 S2V 视频原始音频（含口播）
        speechVolume: input.speechVolume ?? 1,
        speechRate: input.speechRate ?? 0,
        backgroundMusicVolume: input.bgMusicVolume ?? 0.2,
        subtitleConfig: input.subtitleConfig,
        // 关键词高亮 → IMS SpecialWordsConfig
        ...(input.highlightWords?.length && {
          specialWordsConfig: input.highlightWords
            .filter((hw) => hw.word)
            .map((hw) => ({
              type: 'Highlight' as const,
              wordsList: [hw.word],
              style: {
                ...(hw.fontColor && { fontColor: hw.fontColor }),
                ...(hw.outlineColour && { outlineColour: hw.outlineColour }),
                ...(hw.bold && { bold: true }),
              },
            })),
        }),
        titleConfig: input.titleConfig ? {
          font: input.titleConfig.font,
          fontSize: input.titleConfig.fontSize,
          fontColor: input.titleConfig.fontColor,
          alignment: input.titleConfig.alignment,
          y: input.titleConfig.y,
          effectColorStyleId: input.titleConfig.effectColorStyleId,
        } : undefined,
        allowEffects: input.effectsConfig?.allowEffects,
        vfxEffectProbability: input.effectsConfig?.vfxEffectProbability,
        vfxFirstClipEffectList: input.effectsConfig?.vfxFirstClipEffectList,
        vfxNotFirstClipEffectList: input.effectsConfig?.vfxNotFirstClipEffectList,
        allowTransition: input.transitionConfig?.allowTransition,
        transitionDuration: input.transitionConfig?.transitionDuration,
        transitionList: input.transitionConfig?.transitionList,
        useUniformTransition: input.transitionConfig?.useUniformTransition,
        allowFilter: input.filterConfig?.allowFilter,
        filterList: input.filterConfig?.filterList,
      });

      // IMS 要求 MediaURL 包含 {index} 占位符，会替换为 001, 002 等
      const outputOssKey = this.storage.generateKey('compose', `${jobId}.mp4`);
      const outputUrl = this.storage.getOssUrl(outputOssKey).replace(/\.mp4$/, '_{index}.mp4');

      const outputConfig = imsProvider.buildOutputConfig({
        outputUrl,
        count: actualVideoCount,
        width: width || 1080,
        height: height || 1920,
        ...(input.maxDuration && { maxDuration: input.maxDuration }),
        ...(input.crf && { crf: input.crf }),
      });

      // Submit to IMS (传入回调 URL 和验证 token)
      const callbackBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '';
      const callbackUrl = callbackBase ? `${callbackBase}/api/callbacks/ims` : undefined;
      const callbackToken = process.env.IMS_CALLBACK_TOKEN || '';
      const imsResult = await imsProvider.submitBatchJob(inputConfig, editingConfig, outputConfig, callbackUrl, callbackToken || undefined);
      this.logger.log(`IMS job submitted: ${imsResult.jobId}`);

      // 立即持久化 imsJobId，防止轮询期间进程崩溃导致丢失
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          externalId: imsResult.jobId,
          output: {
            imsJobId: imsResult.jobId,
            outputUrl,
            pipeline: steps.map((s) => ({
              scriptId: s.scriptId,
              scriptTitle: s.scriptTitle,
              ttsAudioUrl: s.ttsAudioUrl,
              s2vVideoUrl: s.s2vVideoUrl,
              status: s.status,
              error: s.error,
            })),
          },
        },
      });

      this.sendProgress(userId, jobId, 'PROCESSING', 75, `IMS 任务已提交: ${imsResult.jobId}`);

      // Poll IMS status
      const imsStatus = await this.pollImsJob(imsResult.jobId, userId, jobId);

      // Update final status
      const output = {
        imsJobId: imsResult.jobId,
        imsStatus,
        pipeline: steps.map((s) => ({
          scriptId: s.scriptId,
          scriptTitle: s.scriptTitle,
          ttsAudioUrl: s.ttsAudioUrl,
          s2vVideoUrl: s.s2vVideoUrl,
          status: s.status,
          error: s.error,
        })),
        outputUrl,
      };

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output,
        },
      });

      this.sendProgress(userId, jobId, 'COMPLETED', 100, '批量混剪完成');
      return output;
    } catch (error: any) {
      this.logger.error(`Batch production ${jobId} failed: ${error.message}`, error.stack);

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMsg: error.message,
        },
      });

      this.sendProgress(userId, jobId, 'FAILED', 0, error.message);

      // Refund credits (扣除已部分退款的金额)
      try {
        const gen = await this.prisma.generation.findUnique({ where: { id: jobId } });
        if (gen?.creditsUsed) {
          const remainingRefund = gen.creditsUsed - partialRefundedAmount;
          if (remainingRefund > 0) {
            await this.userService.addCredits(
              userId,
              remainingRefund,
              'REFUND',
              `退款: 批量混剪失败 - ${error.message.slice(0, 100)}`,
              jobId,
            );
          }
        }
      } catch (refundErr: any) {
        this.logger.error(`Refund failed for ${jobId}: ${refundErr.message}`);
      }

      throw error;
    }
  }

  private async pollS2vTasks(
    steps: PipelineStep[],
    userId: string,
    jobId: string,
    allSteps: PipelineStep[],
  ): Promise<void> {
    const maxAttempts = 120; // 120 * 5s = 10 minutes max
    const interval = 5000;
    const dhProvider = this.providers.digitalHumanProvider;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pending = steps.filter((s) => s.status === 's2v');
      if (pending.length === 0) break;

      await new Promise((r) => setTimeout(r, interval));

      for (const step of pending) {
        try {
          const status = await dhProvider.checkTaskStatus(step.s2vTaskId!);

          if (status.status === 'SUCCEEDED') {
            step.s2vVideoUrl = status.videoUrl;
            step.status = 's2v_done';
            this.logger.log(`S2V completed for ${step.scriptId}: ${status.videoUrl}`);
          } else if (status.status === 'FAILED') {
            step.status = 'failed';
            step.error = 'S2V generation failed';
            this.logger.error(`S2V failed for ${step.scriptId}`);
          }
        } catch (err: any) {
          this.logger.warn(`S2V poll error for ${step.scriptId}: ${err.message}`);
        }
      }

      // Update progress
      const s2vDone = allSteps.filter((s) => s.status === 's2v_done' || (s.status === 'failed' && s.error?.includes('S2V'))).length;
      const s2vTotal = allSteps.filter((s) => s.s2vTaskId || s.status === 's2v_done').length;
      if (s2vTotal > 0) {
        const progress = 30 + Math.round((s2vDone / s2vTotal) * 40);
        this.sendProgress(userId, jobId, 'PROCESSING', progress, `数字人视频生成: ${s2vDone}/${s2vTotal}`);
      }
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
          throw new Error('IMS batch compose job failed');
        }

        // Progress based on sub-job status
        const progress = 75 + Math.round((status.progress || 0) * 0.2);
        this.sendProgress(userId, jobId, 'PROCESSING', Math.min(progress, 94), `IMS 处理中: ${status.progress || 0}%`);
      } catch (err: any) {
        if (err.message.includes('failed')) throw err;
        this.logger.warn(`IMS poll error: ${err.message}`);
      }
    }

    throw new Error('IMS job timed out after 60 minutes');
  }

  private parseResolution(resolution: string): string {
    // wan2.2-s2v 只支持 720P 和 1080P 两种分辨率
    // 竖屏/横屏/方形都使用对应的分辨率档位
    if (resolution.toUpperCase().includes('1080')) return '1080P';
    if (resolution.toUpperCase().includes('1920')) return '1080P';
    if (resolution.toUpperCase().includes('720')) return '720P';
    const parts = resolution.split('x').map(Number);
    const maxDim = Math.max(...parts.filter((n) => !isNaN(n)));
    if (maxDim >= 1080) return '1080P';
    return '720P';
  }

  private parseResolutionWH(resolution: string): { width: number; height: number } {
    const parts = resolution.split('x').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { width: parts[0], height: parts[1] };
    }
    // Fallback for common named resolutions
    if (resolution.toUpperCase().includes('1080')) return { width: 1080, height: 1920 };
    return { width: 720, height: 1280 };
  }

  private sendProgress(userId: string, jobId: string, status: string, progress: number, message: string) {
    this.ws.sendToUser(userId, 'compose:progress', { jobId, status, progress, message });
  }

  private async updateJobStatus(jobId: string, status: string) {
    await this.prisma.generation.update({
      where: { id: jobId },
      data: { status: status as any },
    });
  }
}
