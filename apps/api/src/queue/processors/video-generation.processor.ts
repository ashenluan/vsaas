import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GenerationService } from '../../generation/generation.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';
import { pollTaskStatus } from './poll-helper';

@Processor('video-generation', { concurrency: 5 })
export class VideoGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoGenerationProcessor.name);

  constructor(
    private readonly generationService: GenerationService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<{ jobId: string; userId: string; input: any }>): Promise<any> {
    const { jobId, userId, input } = job.data;
    this.logger.log(`Processing video generation ${jobId}`);

    try {
      await this.generationService.updateStatus(jobId, 'PROCESSING');
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'PROCESSING' });

      const provider = this.providers.getVideoProvider(input.providerId);
      if (!provider) throw new Error(`Provider ${input.providerId} not found`);

      // 积分已在 service 层扣除，此处不再重复扣费
      const result = await provider.generateVideo(input);

      // 如果返回了 taskId（异步模式），需要轮询等待完成
      let finalResult = result;
      if (result.taskId && result.status !== 'completed') {
        this.ws.sendToUser(userId, 'job:update', { jobId, status: 'PROCESSING', message: '视频生成中，等待完成...' });

        // 保存 externalId 以便追踪
        await this.generationService.updateExternalId(jobId, result.taskId);

        finalResult = await this.pollTaskCompletion(provider, result.taskId, userId, jobId);
      }

      const metadata = {
        ...finalResult,
        storedAt: new Date().toISOString(),
      };

      await this.generationService.updateStatus(jobId, 'COMPLETED', metadata);
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'COMPLETED', result: metadata });

      return metadata;
    } catch (error: any) {
      this.logger.error(`Video generation ${jobId} failed: ${error.message}`);

      await this.generationService.updateStatus(jobId, 'FAILED', { error: error.message });
      this.ws.sendToUser(userId, 'job:update', { jobId, status: 'FAILED', error: error.message });

      try {
        const gen = await this.generationService.findById(jobId);
        if (gen?.creditsUsed) {
          await this.userService.addCredits(userId, gen.creditsUsed, 'REFUND', `退款: 视频生成失败 - ${error.message.slice(0, 100)}`, jobId);
        }
      } catch (refundError: any) {
        this.logger.error(`Failed to refund credits for ${jobId}: ${refundError.message}`);
      }

      throw error;
    }
  }

  private async pollTaskCompletion(
    provider: any,
    taskId: string,
    userId: string,
    jobId: string,
  ): Promise<any> {
    if (typeof provider.checkTaskStatus !== 'function') {
      return { taskId, status: 'completed', message: 'Provider does not support polling' };
    }

    return pollTaskStatus(taskId, {
      interval: 5000,
      maxAttempts: 180,
      checkStatus: (tid) => provider.checkTaskStatus(tid),
      normalizeStatus: (s) => (s.status || '').toUpperCase(),
      extractResult: (s) => s,
      extractError: (s) => `视频生成失败: ${s.error || s.message || '未知错误'}`,
      ws: this.ws,
      userId,
      jobId,
      wsEvent: 'job:update',
      progressInterval: 6,
      buildProgressMessage: (i) => ({ message: `视频生成中... (${Math.round(i * 5 / 60)}分钟)` }),
      logger: this.logger,
      timeoutMessage: 'Video generation timed out after 15 minutes',
    });
  }
}
