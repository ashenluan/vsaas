import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProvider } from '../provider.registry';

@Injectable()
export class JimengVideoProvider implements VideoProvider {
  readonly providerId = 'jimeng-video';
  readonly displayName = 'Seedance 2.0';
  private readonly logger = new Logger(JimengVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('VOLCENGINE_API_KEY');
  }

  estimateCost(request: any): number {
    const duration = request.duration ?? 5;
    return duration * 5;
  }

  async generateVideo(request: any): Promise<any> {
    const apiKey = this.config.get<string>('VOLCENGINE_API_KEY');
    const baseUrl = this.config.get<string>(
      'VOLCENGINE_BASE_URL',
      'https://ark.cn-beijing.volces.com/api/v3',
    );
    const model = request.model || 'seedance-2.0';

    this.logger.log(`Generating video with ${model}: ${request.prompt?.slice(0, 80)}`);

    // Volcengine Ark API for Seedance video generation
    const body: any = {
      model,
      prompt: request.prompt,
      duration: request.duration ?? 5,
      aspect_ratio: request.aspectRatio ?? '16:9',
    };

    if (request.referenceImage) {
      body.image = { url: request.referenceImage };
    }

    const response = await fetch(`${baseUrl}/videos/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Seedance API error: ${data.error?.message || data.message || response.statusText}`);
    }

    return {
      taskId: data.id || data.task_id,
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

    const response = await fetch(`${baseUrl}/videos/generations/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    return {
      taskId,
      status: data.status || 'unknown',
      videoUrl: data.video?.url || data.url,
      provider: this.providerId,
    };
  }
}
