import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GenerationService } from '../../generation/generation.service';
import { ProviderRegistry } from '../../provider/provider.registry';
import { UserService } from '../../user/user.service';
import { WsGateway } from '../../ws/ws.gateway';

@Processor('image-generation', { concurrency: 10 })
export class ImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageGenerationProcessor.name);

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
    const isAdvanced = job.name === 'generate-advanced';
    this.logger.log(`Processing ${isAdvanced ? 'advanced' : 'standard'} image generation ${jobId}`);

    try {
      await this.generationService.updateStatus(jobId, 'PROCESSING');
      this.ws.sendToUser(userId, 'generation:status', { jobId, status: 'PROCESSING' });

      let result: any;

      if (isAdvanced) {
        // Advanced types: route to first available image provider
        // Each provider's generateImage should inspect input.type to handle accordingly
        const providerId = input.providerId || 'qwen';
        const provider = this.providers.getImageProvider(providerId);
        if (!provider) {
          // Fallback: try any available provider
          const available = await this.providers.getAvailableImageProviders();
          if (available.length === 0) throw new Error('No image provider available');
          result = await available[0].generateImage(input);
        } else {
          result = await provider.generateImage(input);
        }
      } else {
        const provider = this.providers.getImageProvider(input.providerId);
        if (!provider) throw new Error(`Provider ${input.providerId} not found`);
        result = await provider.generateImage(input);
      }

      // 如果返回了 taskId（异步模式，如 wan2.5），需要轮询等待完成
      if (result.taskId && !result.images?.length) {
        this.ws.sendToUser(userId, 'generation:status', { jobId, status: 'PROCESSING', message: '图片生成中，等待完成...' });
        await this.generationService.updateExternalId(jobId, result.taskId);
        result = await this.pollImageTask(result, input, userId, jobId);
      }

      const metadata = {
        ...result,
        storedAt: new Date().toISOString(),
      };

      await this.generationService.updateStatus(jobId, 'COMPLETED', metadata);
      this.ws.sendToUser(userId, 'generation:status', { jobId, status: 'COMPLETED', output: metadata, result: metadata });

      return metadata;
    } catch (error: any) {
      this.logger.error(`Image generation ${jobId} failed: ${error.message}`);

      await this.generationService.updateStatus(jobId, 'FAILED', { error: error.message });
      this.ws.sendToUser(userId, 'generation:status', { jobId, status: 'FAILED', errorMsg: error.message });

      try {
        const gen = await this.generationService.findById(jobId);
        if (gen?.creditsUsed) {
          await this.userService.addCredits(userId, gen.creditsUsed, 'REFUND', `退款: 图片生成失败 - ${error.message.slice(0, 100)}`, jobId);
        }
      } catch (refundError: any) {
        this.logger.error(`Failed to refund credits for ${jobId}: ${refundError.message}`);
      }

      throw error;
    }
  }

  private async pollImageTask(
    initialResult: any,
    input: any,
    userId: string,
    jobId: string,
  ): Promise<any> {
    const maxAttempts = 60; // 60 * 3s = 3 minutes
    const interval = 3000;
    const providerId = input.providerId || 'qwen';
    const provider = this.providers.getImageProvider(providerId) as any;

    if (!provider?.checkTaskStatus) {
      return initialResult;
    }

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      const status = await provider.checkTaskStatus(initialResult.taskId);
      const normalizedStatus = (status.status || '').toUpperCase();

      if (normalizedStatus === 'SUCCEEDED') {
        return status;
      }
      if (normalizedStatus === 'FAILED') {
        throw new Error(`Image generation failed: ${status.message || 'Unknown error'}`);
      }

      if (i > 0 && i % 10 === 0) {
        this.ws.sendToUser(userId, 'generation:status', {
          jobId,
          status: 'PROCESSING',
          message: `图片生成中... (${Math.round(i * 3 / 60)}分钟)`,
        });
      }
    }

    throw new Error('Image generation timed out');
  }
}
