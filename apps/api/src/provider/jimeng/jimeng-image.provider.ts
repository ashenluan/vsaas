import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageProvider } from '../provider.registry';

@Injectable()
export class JimengImageProvider implements ImageProvider {
  readonly providerId = 'jimeng';
  readonly displayName = '即梦 (Jimeng)';
  private readonly logger = new Logger(JimengImageProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('VOLCENGINE_API_KEY');
  }

  estimateCost(request: any): number {
    return (request.count ?? 1) * 6;
  }

  async generateImage(request: any): Promise<any> {
    const apiKey = this.config.get<string>('VOLCENGINE_API_KEY');
    const baseUrl = this.config.get<string>(
      'VOLCENGINE_BASE_URL',
      'https://ark.cn-beijing.volces.com/api/v3',
    );
    const model = request.model || 'jimeng-5.0';

    this.logger.log(`Generating image with Jimeng (${model}): ${request.prompt?.slice(0, 80)}`);

    // Volcengine Ark API for Jimeng image generation
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        width: request.width ?? 1024,
        height: request.height ?? 1024,
        n: request.count ?? 1,
        seed: request.seed,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Jimeng API error: ${data.error?.message || data.message || response.statusText}`);
    }

    // Sync response with images
    if (data.data) {
      return {
        images: data.data.map((img: any) => ({
          url: img.url,
          b64: img.b64_json,
        })),
        provider: this.providerId,
        modelId: model,
        usage: { credits: this.estimateCost(request) },
      };
    }

    // Async response with task_id
    return {
      taskId: data.task_id || data.id,
      status: data.status || 'processing',
      provider: this.providerId,
      modelId: model,
      raw: data,
    };
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    const apiKey = this.config.get<string>('VOLCENGINE_API_KEY');
    const baseUrl = this.config.get<string>(
      'VOLCENGINE_BASE_URL',
      'https://ark.cn-beijing.volces.com/api/v3',
    );

    const response = await fetch(`${baseUrl}/images/generations/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    return {
      taskId,
      status: data.status || 'unknown',
      images: data.data?.map((img: any) => ({ url: img.url })) ?? [],
      provider: this.providerId,
    };
  }
}
