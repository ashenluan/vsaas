import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GenerationService } from '../../generation/generation.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { StorageService } from '../../storage/storage.service';
import { WsGateway } from '../../ws/ws.gateway';
import { pollTaskStatus } from './poll-helper';

interface StoryboardComposeData {
  jobId: string;
  userId: string;
  videos: { url: string; duration: number }[];
  transition?: string;          // e.g. 'fade', 'dissolve'
  transitionDuration?: number;  // seconds, default 1
  width: number;
  height: number;
  bgMusicUrl?: string;
}

@Processor('storyboard-compose', { concurrency: 3 })
export class StoryboardComposeProcessor extends WorkerHost {
  private readonly logger = new Logger(StoryboardComposeProcessor.name);

  constructor(
    private readonly generationService: GenerationService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<StoryboardComposeData>): Promise<any> {
    const { jobId, userId, videos, transition, transitionDuration = 1, width, height, bgMusicUrl } = job.data;
    this.logger.log(`Processing storyboard compose ${jobId}: ${videos.length} clips`);

    try {
      await this.generationService.updateStatus(jobId, 'PROCESSING');
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'PROCESSING', message: '正在合成视频...' });

      // Build IMS Timeline
      const timeline = this.buildTimeline(videos, transition, transitionDuration, bgMusicUrl);

      // Output URL
      const outputKey = this.storage.generateKey('storyboard/compose', 'output.mp4');
      const outputUrl = this.storage.getOssUrl(outputKey);

      // Submit to IMS
      const imsProvider = this.providers.batchComposeProvider;
      const { jobId: imsJobId } = await imsProvider.submitTimelineJob(
        timeline,
        { mediaUrl: outputUrl, width, height },
      );

      this.logger.log(`IMS timeline job submitted: ${imsJobId}`);
      await this.generationService.updateExternalId(jobId, imsJobId);

      // Poll for completion
      const result = await this.pollImsJob(imsProvider, imsJobId, userId, jobId);

      // Sign output URL for user access
      const signedUrl = result.mediaUrl
        ? this.storage.ensureSignedUrl(result.mediaUrl)
        : outputUrl;

      const metadata = {
        videoUrl: signedUrl,
        mediaUrl: result.mediaUrl,
        duration: result.duration,
        imsJobId,
      };

      await this.generationService.updateStatus(jobId, 'COMPLETED', metadata);
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'COMPLETED', result: metadata });

      return metadata;
    } catch (error: any) {
      this.logger.error(`Storyboard compose ${jobId} failed: ${error.message}`);

      await this.generationService.updateStatus(jobId, 'FAILED', { error: error.message });
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'FAILED', error: error.message });

      // Refund credits
      try {
        const gen = await this.generationService.findById(jobId);
        if (gen?.creditsUsed) {
          await this.userService.addCredits(userId, gen.creditsUsed, 'REFUND', `退款: 成片合成失败 - ${error.message.slice(0, 100)}`, jobId);
        }
      } catch (refundError: any) {
        this.logger.error(`Failed to refund credits for ${jobId}: ${refundError.message}`);
      }

      throw error;
    }
  }

  private buildTimeline(
    videos: { url: string; duration: number }[],
    transition?: string,
    transitionDuration = 1,
    bgMusicUrl?: string,
  ): any {
    const videoClips = videos.map((v) => {
      const clip: any = {
        MediaURL: v.url,
        Type: 'Video',
      };
      // Add transition effect to each clip (except first)
      if (transition) {
        clip.Effects = [{
          Type: 'Transition',
          SubType: transition,
          Duration: transitionDuration,
        }];
      }
      return clip;
    });

    // Remove transition from first clip
    if (transition && videoClips.length > 0) {
      delete videoClips[0].Effects;
    }

    const timeline: any = {
      VideoTracks: [{ VideoTrackClips: videoClips }],
    };

    // Add background music as audio track
    if (bgMusicUrl) {
      timeline.AudioTracks = [{
        AudioTrackClips: [{
          MediaURL: bgMusicUrl,
          LoopMode: true,
          Effects: [{ Type: 'Volume', Gain: 0.3 }],
        }],
      }];
    }

    return timeline;
  }

  private async pollImsJob(
    imsProvider: any,
    imsJobId: string,
    userId: string,
    jobId: string,
  ): Promise<{ status: string; mediaUrl?: string; duration?: number }> {
    return pollTaskStatus(imsJobId, {
      interval: 5000,
      maxAttempts: 120,
      checkStatus: (id) => imsProvider.checkMediaProducingJobStatus(id),
      normalizeStatus: (s) => (s.status || '').toUpperCase(),
      extractResult: (s) => s,
      extractError: (s) => `合成失败: ${s.errorMessage || s.errorCode || '未知错误'}`,
      ws: this.ws,
      userId,
      jobId,
      wsEvent: 'job:update',
      progressInterval: 4,
      buildProgressMessage: (i, max) => {
        const progress = Math.min(90, Math.round(i / max * 100));
        return { message: `合成中... ${progress}%`, progress };
      },
      logger: this.logger,
      timeoutMessage: '视频合成超时，请稍后重试',
    });
  }
}
