import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { StorageService } from '../../storage/storage.service';
import { WsGateway } from '../../ws/ws.gateway';

// ========== Interfaces ==========

interface DhBatchV2JobData {
  jobId: string;
  userId: string;
  channel: 'A' | 'B'; // A = IMS 内置数字人, B = 自定义照片 S2V
  input: {
    // Channel A
    builtinAvatarId?: string;
    // Channel B
    avatarUrl?: string;

    voiceId: string;
    scripts: { id: string; title: string; content: string }[];
    materials: { id: string; name: string; type: string; url: string; duration?: number }[];
    bgMusic?: string;
    videoCount: number;
    resolution: string;
    subtitleConfig?: {
      open?: boolean;
      style?: string;
      font?: string;
      fontSize?: number;
      fontColor?: string;
    };
    speechRate?: number;
    mediaVolume?: number;
    speechVolume?: number;
    bgMusicVolume?: number;
    transitionId?: string;
    maxDuration?: number;
    crf?: number;
  };
}

interface Segment {
  index: number;
  type: 'DH' | 'MAT';
  text: string;
  scriptId: string;
  ttsAudioUrl?: string;
  ttsDuration?: number; // estimated seconds
  s2vTaskId?: string;
  s2vVideoUrl?: string;
  s2vDuration?: number;
  status: 'pending' | 'tts' | 'tts_done' | 's2v' | 's2v_done' | 'ready' | 'failed';
  error?: string;
}

// ========== Processor ==========

@Processor('dh-batch-v2', { concurrency: 2 })
export class DhBatchV2Processor extends WorkerHost {
  private readonly logger = new Logger(DhBatchV2Processor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<DhBatchV2JobData>): Promise<any> {
    const { jobId, userId, channel, input } = job.data;
    this.logger.log(`DhBatchV2 ${jobId}: channel=${channel}, scripts=${input.scripts.length}, videos=${input.videoCount}`);

    let partialRefundedAmount = 0;

    try {
      await this.updateJobStatus(jobId, 'PROCESSING');
      this.sendProgress(userId, jobId, 'PROCESSING', 0, '开始处理数字人交错混剪任务');

      // ===== Phase 1: Segment Planning =====
      this.sendProgress(userId, jobId, 'PROCESSING', 2, '正在规划片段结构...');
      const allSegments: Segment[][] = []; // per-script segments

      for (const script of input.scripts) {
        const segments = this.planSegments(script.id, script.content);
        allSegments.push(segments);
        this.logger.log(
          `Script ${script.id}: ${segments.length} segments ` +
          `(${segments.filter((s) => s.type === 'DH').length} DH, ${segments.filter((s) => s.type === 'MAT').length} MAT)`,
        );
      }

      const flatSegments = allSegments.flat();
      const dhSegments = flatSegments.filter((s) => s.type === 'DH');
      const matSegments = flatSegments.filter((s) => s.type === 'MAT');
      this.logger.log(`Total: ${flatSegments.length} segments (${dhSegments.length} DH, ${matSegments.length} MAT)`);

      // ===== Phase 2: TTS for ALL segments =====
      this.sendProgress(userId, jobId, 'PROCESSING', 5, `开始语音合成 (${flatSegments.length} 个片段)`);
      await this.runTtsPhase(
        flatSegments,
        input.voiceId,
        userId,
        jobId,
        input.speechRate !== undefined ? { speechRate: input.speechRate } : undefined,
      );

      const ttsSuccessful = flatSegments.filter((s) => s.status === 'tts_done');
      if (ttsSuccessful.length === 0) {
        throw new Error('所有片段的语音合成都失败了');
      }

      await this.persistPipelineState(jobId, allSegments, 'tts_done');

      // ===== Phase 3: S2V for DH segments (Channel B only) =====
      if (channel === 'B') {
        const dhReady = dhSegments.filter((s) => s.status === 'tts_done');
        if (dhReady.length === 0) {
          throw new Error('所有数字人片段的语音合成都失败了，无法生成数字人视频');
        }

        this.sendProgress(userId, jobId, 'PROCESSING', 30, `开始数字人视频生成 (${dhReady.length} 个 DH 片段)`);
        await this.runS2vPhase(dhReady, input.avatarUrl!, input.resolution, userId, jobId, flatSegments);

        const s2vSuccessful = dhReady.filter((s) => s.status === 's2v_done');
        if (s2vSuccessful.length === 0) {
          throw new Error('所有数字人视频生成都失败了');
        }

        // Re-upload cross-region S2V videos
        this.sendProgress(userId, jobId, 'PROCESSING', 65, '正在转存数字人视频到同区域存储...');
        await this.reuploadS2vVideos(s2vSuccessful);

        await this.persistPipelineState(jobId, allSegments, 's2v_done');
      } else {
        // Channel A: mark DH segments as ready (no S2V needed)
        for (const seg of dhSegments) {
          if (seg.status === 'tts_done') seg.status = 'ready';
        }
      }

      // Mark MAT segments as ready
      for (const seg of matSegments) {
        if (seg.status === 'tts_done') seg.status = 'ready';
      }

      // ===== Phase 4: IMS Timeline Compose (one per output video) =====
      this.sendProgress(userId, jobId, 'PROCESSING', 70, `开始合成 ${input.videoCount} 个视频`);

      const imsProvider = this.providers.batchComposeProvider;
      const { width, height } = this.parseResolutionWH(input.resolution);
      const callbackBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '';
      const callbackUrl = callbackBase ? `${callbackBase}/api/callbacks/ims` : undefined;
      const callbackToken = process.env.IMS_CALLBACK_TOKEN || '';

      // Submit one Timeline job per output video
      const timelineJobs: { videoIndex: number; jobId: string; outputUrl: string }[] = [];

      for (let i = 0; i < input.videoCount; i++) {
        try {
          const timeline = this.buildTimeline(
            allSegments,
            input.materials,
            i,
            channel,
            input,
            width,
            height,
          );

          const outputOssKey = this.storage.generateKey('dh-v2', `${jobId}_${String(i + 1).padStart(3, '0')}.mp4`);
          const outputUrl = this.storage.getOssUrl(outputOssKey);

          const result = await imsProvider.submitTimelineJob(
            timeline,
            { mediaUrl: outputUrl, width, height },
            callbackUrl,
            callbackToken || undefined,
          );

          timelineJobs.push({ videoIndex: i, jobId: result.jobId, outputUrl });
          this.logger.log(`Timeline job #${i + 1} submitted: ${result.jobId}`);
        } catch (err: any) {
          this.logger.error(`Timeline job #${i + 1} submit failed: ${err.message}`);
        }
      }

      if (timelineJobs.length === 0) {
        throw new Error('所有 Timeline 合成任务提交都失败了');
      }

      // Persist timeline job IDs
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          externalId: timelineJobs[0].jobId,
          output: {
            phase: 'timeline_submitted',
            timelineJobs: timelineJobs.map((j) => ({ index: j.videoIndex, jobId: j.jobId, outputUrl: j.outputUrl })),
            pipeline: this.serializeSegments(allSegments),
          },
        },
      });

      this.sendProgress(userId, jobId, 'PROCESSING', 75, `已提交 ${timelineJobs.length} 个 Timeline 合成任务`);

      // Poll all Timeline jobs
      const outputVideos = await this.pollTimelineJobs(timelineJobs, imsProvider, userId, jobId);

      // Partial refund if some jobs failed
      if (outputVideos.length < input.videoCount) {
        const costPerVideo = 20;
        const refundAmount = (input.videoCount - outputVideos.length) * costPerVideo;
        if (refundAmount > 0) {
          try {
            await this.userService.addCredits(
              userId,
              refundAmount,
              'REFUND',
              `部分退款: ${input.videoCount - outputVideos.length} 条视频合成失败`,
              jobId,
            );
            partialRefundedAmount = refundAmount;
            await this.prisma.generation.update({
              where: { id: jobId },
              data: { creditsUsed: outputVideos.length * costPerVideo },
            });
          } catch (refundErr: any) {
            this.logger.error(`Partial refund failed for ${jobId}: ${refundErr.message}`);
          }
        }
      }

      // Final output
      const output = {
        channel,
        outputVideos,
        timelineJobs: timelineJobs.map((j) => ({ index: j.videoIndex, jobId: j.jobId, outputUrl: j.outputUrl })),
        pipeline: this.serializeSegments(allSegments),
      };

      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output,
        },
      });

      this.ws.sendToUser(userId, 'dh-batch-v2:progress', {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        message: `数字人交错混剪完成，生成 ${outputVideos.length} 个视频`,
        outputVideos,
      });
      return output;
    } catch (error: any) {
      this.logger.error(`DhBatchV2 ${jobId} failed: ${error.message}`, error.stack);

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
          const remainingRefund = gen.creditsUsed - partialRefundedAmount;
          if (remainingRefund > 0) {
            await this.userService.addCredits(
              userId,
              remainingRefund,
              'REFUND',
              `退款: 数字人交错混剪失败 - ${error.message.slice(0, 100)}`,
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

  // ========== Phase 1: Segment Planning ==========

  /**
   * 将脚本文本拆分为交错的 DH/MAT 片段
   * 按句子分割，奇数句→DH（数字人出镜），偶数句→MAT（素材+旁白）
   * 每段≤60字（S2V 20s音频限制，中文约4字/秒）
   */
  private planSegments(scriptId: string, text: string): Segment[] {
    const MAX_CHARS = 60;
    const sentences = text.split(/(?<=[。！？；\n])/g).filter((s) => s.trim());

    // Group sentences into chunks of ≤ MAX_CHARS
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if (current.length + sentence.length <= MAX_CHARS) {
        current += sentence;
      } else {
        if (current) chunks.push(current.trim());
        if (sentence.length > MAX_CHARS) {
          // Split long sentence on commas
          const parts = sentence.split(/(?<=[，、,])/g).filter((s) => s.trim());
          let sub = '';
          for (const part of parts) {
            if (sub.length + part.length <= MAX_CHARS) {
              sub += part;
            } else {
              if (sub) chunks.push(sub.trim());
              sub = part;
            }
          }
          current = sub;
        } else {
          current = sentence;
        }
      }
    }
    if (current.trim()) chunks.push(current.trim());

    // If no chunks, use original text
    if (chunks.length === 0) chunks.push(text);

    // Alternate DH/MAT
    return chunks.map((chunk, i) => ({
      index: i,
      type: (i % 2 === 0 ? 'DH' : 'MAT') as 'DH' | 'MAT',
      text: chunk,
      scriptId,
      status: 'pending' as const,
    }));
  }

  // ========== Phase 2: TTS ==========

  private async runTtsPhase(
    segments: Segment[],
    voiceId: string,
    userId: string,
    jobId: string,
    voiceOptions?: { speechRate?: number; pitchRate?: number; volume?: number },
  ): Promise<void> {
    const TTS_CONCURRENCY = 3;
    const voiceProvider = this.providers.voiceProvider;

    for (let i = 0; i < segments.length; i += TTS_CONCURRENCY) {
      const batch = segments.slice(i, i + TTS_CONCURRENCY);

      await Promise.all(
        batch.map(async (seg) => {
          try {
            seg.status = 'tts';
            const result = await voiceProvider.synthesizeSpeech(seg.text, voiceId, voiceOptions);
            seg.ttsAudioUrl = result.audioUrl;
            seg.ttsDuration = this.estimateTtsDuration(seg.text);
            seg.status = 'tts_done';
          } catch (error: any) {
            seg.status = 'failed';
            seg.error = `TTS 合成失败: ${error.message}`;
            this.logger.error(`TTS failed for segment ${seg.index}: ${error.message}`);
          }
        }),
      );

      const done = segments.filter((s) => s.status === 'tts_done' || s.status === 'failed').length;
      const progress = 5 + Math.round((done / segments.length) * 25);
      this.sendProgress(userId, jobId, 'PROCESSING', progress, `语音合成: ${done}/${segments.length}`);
    }
  }

  /** 估算 TTS 音频时长（中文约4字/秒） */
  private estimateTtsDuration(text: string): number {
    const CHARS_PER_SEC = 4;
    return Math.max(1, Math.ceil(text.length / CHARS_PER_SEC));
  }

  // ========== Phase 3: S2V (Channel B only) ==========

  private async runS2vPhase(
    dhSegments: Segment[],
    avatarUrl: string,
    resolution: string,
    userId: string,
    jobId: string,
    allSegments: Segment[],
  ): Promise<void> {
    const dhProvider = this.providers.digitalHumanProvider;
    const S2V_SUBMIT_BATCH = 4;

    // Submit all S2V tasks
    for (let i = 0; i < dhSegments.length; i += S2V_SUBMIT_BATCH) {
      const batch = dhSegments.slice(i, i + S2V_SUBMIT_BATCH);

      await Promise.all(
        batch.map(async (seg) => {
          try {
            seg.status = 's2v';
            const result = await dhProvider.generateVideo(
              avatarUrl,
              seg.ttsAudioUrl!,
              this.parseResolution(resolution),
            );
            seg.s2vTaskId = result.taskId;
            this.logger.log(`S2V submitted for DH segment ${seg.index}: ${result.taskId}`);
          } catch (error: any) {
            seg.status = 'failed';
            seg.error = `S2V 提交失败: ${error.message}`;
            this.logger.error(`S2V submit failed for segment ${seg.index}: ${error.message}`);
          }
        }),
      );
    }

    // Unified polling
    const pending = dhSegments.filter((s) => s.s2vTaskId && s.status === 's2v');
    this.logger.log(`S2V tasks submitted: ${pending.length}, starting unified polling`);

    const maxAttempts = 120; // 120 * 5s = 10 min
    const interval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const stillPending = pending.filter((s) => s.status === 's2v');
      if (stillPending.length === 0) break;

      await new Promise((r) => setTimeout(r, interval));

      for (const seg of stillPending) {
        try {
          const status = await dhProvider.checkTaskStatus(seg.s2vTaskId!);

          if (status.status === 'SUCCEEDED') {
            seg.s2vVideoUrl = status.videoUrl;
            seg.s2vDuration = undefined; // will be known from video
            seg.status = 's2v_done';
            this.logger.log(`S2V completed for segment ${seg.index}: ${status.videoUrl}`);
          } else if (status.status === 'FAILED') {
            seg.status = 'failed';
            seg.error = `S2V 生成失败: ${status.errorMessage || status.errorCode || '未知错误'}`;
            this.logger.error(`S2V failed for segment ${seg.index}: ${status.errorCode}`);
          } else if (status.status === 'CANCELED' || status.status === 'UNKNOWN') {
            seg.status = 'failed';
            seg.error = status.status === 'CANCELED' ? 'S2V 任务已被取消' : 'S2V 任务已过期或不存在';
          }
        } catch (err: any) {
          this.logger.warn(`S2V poll error for segment ${seg.index}: ${err.message}`);
          if (err.message?.includes('Throttling') || err.message?.includes('429')) {
            await new Promise((r) => setTimeout(r, 10000));
          }
        }
      }

      // Progress update
      const s2vDone = dhSegments.filter((s) => s.status === 's2v_done' || (s.status === 'failed' && s.s2vTaskId)).length;
      const progress = 30 + Math.round((s2vDone / dhSegments.length) * 35);
      this.sendProgress(userId, jobId, 'PROCESSING', progress, `数字人视频: ${s2vDone}/${dhSegments.length}`);
    }
  }

  private async reuploadS2vVideos(segments: Segment[]): Promise<void> {
    for (const seg of segments) {
      if (!seg.s2vVideoUrl) continue;
      const regionCheck = this.storage.validateOssRegion(seg.s2vVideoUrl);
      if (!regionCheck.valid || seg.s2vVideoUrl.includes('dashscope-result')) {
        try {
          const localUrl = await this.storage.copyExternalToOss(seg.s2vVideoUrl, 's2v', 'mp4');
          seg.s2vVideoUrl = localUrl;
        } catch (err: any) {
          this.logger.error(`Re-upload failed for segment ${seg.index}: ${err.message}`);
        }
      }
    }
  }

  // ========== Phase 4: Timeline Build + Compose ==========

  /**
   * 构建 IMS Timeline JSON
   * 交错结构: [DH片段] → [素材+旁白] → [DH片段] → [素材+旁白]
   */
  private buildTimeline(
    allSegments: Segment[][],
    materials: { id: string; url: string; duration?: number }[],
    videoIndex: number,
    channel: 'A' | 'B',
    input: DhBatchV2JobData['input'],
    width: number,
    height: number,
  ): any {
    const videoClips: any[] = [];
    const audioClips: any[] = [];
    const subtitleClips: any[] = [];
    let timeOffset = 0;
    let materialIndex = videoIndex; // offset per video for variety

    // Flatten all script segments into one timeline
    for (const scriptSegments of allSegments) {
      for (const seg of scriptSegments) {
        if (seg.status === 'failed') continue;

        const segDuration = seg.s2vDuration || seg.ttsDuration || this.estimateTtsDuration(seg.text);

        if (seg.type === 'DH') {
          if (channel === 'B' && seg.s2vVideoUrl) {
            // Channel B: use S2V video (has baked-in audio)
            videoClips.push({
              MediaURL: seg.s2vVideoUrl,
              TimelineIn: timeOffset,
              TimelineOut: timeOffset + segDuration,
            });
          } else if (channel === 'A' && input.builtinAvatarId) {
            // Channel A: use IMS AI_Avatar with audio-driven mode
            videoClips.push({
              Type: 'AI_Avatar',
              AvatarId: input.builtinAvatarId,
              MediaURL: seg.ttsAudioUrl, // TTS 音频驱动数字人口型
              TimelineIn: timeOffset,
              TimelineOut: timeOffset + segDuration,
              Width: width,
              Height: height,
            });
          }
        } else {
          // MAT segment: material video + TTS voiceover
          if (materials.length > 0) {
            const mat = materials[materialIndex % materials.length];
            materialIndex++;

            videoClips.push({
              MediaURL: mat.url,
              TimelineIn: timeOffset,
              TimelineOut: timeOffset + segDuration,
              // Trim material to match TTS duration
              Out: segDuration,
            });
          }

          // TTS voiceover for MAT segment
          if (seg.ttsAudioUrl) {
            audioClips.push({
              MediaURL: seg.ttsAudioUrl,
              TimelineIn: timeOffset,
              TimelineOut: timeOffset + segDuration,
            });
          }
        }

        // Subtitle for every segment
        if (input.subtitleConfig?.open !== false && seg.text) {
          subtitleClips.push({
            Type: 'Text',
            Content: seg.text,
            TimelineIn: timeOffset,
            TimelineOut: timeOffset + segDuration,
            X: 0,
            Y: 0.85,
            FontSize: input.subtitleConfig?.fontSize || 28,
            FontColor: input.subtitleConfig?.fontColor || '#FFFFFF',
            Font: input.subtitleConfig?.font || 'alibaba-sans',
            Alignment: 'BottomCenter',
            ...(input.subtitleConfig?.style && { FontFace: { OutlineColour: '#000000', Outline: 1 } }),
          });
        }

        timeOffset += segDuration;
      }
    }

    // Add transition between clips
    if (input.transitionId && videoClips.length > 1) {
      for (let i = 1; i < videoClips.length; i++) {
        videoClips[i].Effects = [
          {
            Type: 'Transition',
            SubType: input.transitionId,
            Duration: 0.5,
          },
        ];
      }
    }

    const timeline: any = {
      VideoTracks: [{
        VideoTrackClips: videoClips,
      }],
    };

    if (audioClips.length > 0) {
      timeline.AudioTracks = [{
        AudioTrackClips: audioClips,
      }];
    }

    // Background music track
    if (input.bgMusic) {
      const bgTrack = {
        AudioTrackClips: [{
          MediaURL: input.bgMusic,
          LoopMode: true,
          Effects: [{ Type: 'Volume', Gain: input.bgMusicVolume ?? 0.2 }],
        }],
      };
      if (timeline.AudioTracks) {
        timeline.AudioTracks.push(bgTrack);
      } else {
        timeline.AudioTracks = [bgTrack];
      }
    }

    if (subtitleClips.length > 0) {
      timeline.SubtitleTracks = [{
        SubtitleTrackClips: subtitleClips,
      }];
    }

    return timeline;
  }

  // ========== Timeline Job Polling ==========

  private async pollTimelineJobs(
    jobs: { videoIndex: number; jobId: string; outputUrl: string }[],
    imsProvider: any,
    userId: string,
    jobId: string,
  ): Promise<{ videoIndex: number; mediaUrl: string; mediaId?: string; duration?: number }[]> {
    const maxAttempts = 360; // 360 * 10s = 60 min
    const interval = 10000;
    const results: { videoIndex: number; mediaUrl: string; mediaId?: string; duration?: number }[] = [];
    const pending = new Map(jobs.map((j) => [j.jobId, j]));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (pending.size === 0) break;

      await new Promise((r) => setTimeout(r, interval));

      for (const [imsJobId, job] of Array.from(pending.entries())) {
        try {
          const status = await imsProvider.checkMediaProducingJobStatus(imsJobId);

          if (status.status === 'Success') {
            results.push({
              videoIndex: job.videoIndex,
              mediaUrl: status.mediaUrl || job.outputUrl,
              mediaId: status.mediaId,
              duration: status.duration,
            });
            pending.delete(imsJobId);
            this.logger.log(`Timeline job #${job.videoIndex + 1} completed: ${status.mediaUrl}`);
          } else if (status.status === 'Failed') {
            pending.delete(imsJobId);
            this.logger.error(`Timeline job #${job.videoIndex + 1} failed: ${status.errorCode} - ${status.errorMessage}`);
          }
        } catch (err: any) {
          this.logger.warn(`Timeline poll error for job #${job.videoIndex + 1}: ${err.message}`);
        }
      }

      const done = results.length + (jobs.length - pending.size - results.length);
      const progress = 75 + Math.round((done / jobs.length) * 25);
      this.sendProgress(userId, jobId, 'PROCESSING', Math.min(progress, 99),
        `Timeline 合成: ${results.length}/${jobs.length} 完成`);
    }

    return results;
  }

  // ========== Utilities ==========

  private parseResolution(resolution: string): string {
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
    if (resolution.toUpperCase().includes('1080')) return { width: 1080, height: 1920 };
    return { width: 720, height: 1280 };
  }

  private sendProgress(userId: string, jobId: string, status: string, progress: number, message: string) {
    this.ws.sendToUser(userId, 'dh-batch-v2:progress', { jobId, status, progress, message });
  }

  private async updateJobStatus(jobId: string, status: string) {
    await this.prisma.generation.update({
      where: { id: jobId },
      data: { status: status as any },
    });
  }

  private serializeSegments(allSegments: Segment[][]): any[] {
    return allSegments.map((segments) =>
      segments.map((s) => ({
        index: s.index,
        type: s.type,
        text: s.text,
        scriptId: s.scriptId,
        ttsAudioUrl: s.ttsAudioUrl,
        ttsDuration: s.ttsDuration,
        s2vTaskId: s.s2vTaskId,
        s2vVideoUrl: s.s2vVideoUrl,
        status: s.status,
        error: s.error,
      })),
    );
  }

  private async persistPipelineState(jobId: string, allSegments: Segment[][], phase: string) {
    try {
      await this.prisma.generation.update({
        where: { id: jobId },
        data: {
          output: {
            phase,
            pipeline: this.serializeSegments(allSegments),
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist pipeline state for ${jobId}: ${err.message}`);
    }
  }
}
