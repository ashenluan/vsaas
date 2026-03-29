import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProvider } from '../provider.registry';

@Injectable()
export class GrokVideoProvider implements VideoProvider {
  readonly providerId = 'grok-video';
  readonly displayName = 'Grok Aurora 视频';
  private readonly logger = new Logger(GrokVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('GROK_API_KEY');
  }

  estimateCost(request: any): number {
    const duration = request.duration ?? 5;
    return duration * 5;
  }

  async generateVideo(request: any): Promise<any> {
    const apiKey = this.config.get<string>('GROK_API_KEY');
    const baseUrl = this.config.get<string>('GROK_BASE_URL', 'https://api.x.ai/v1');

    this.logger.log(`Generating video with Grok Aurora: ${request.prompt?.slice(0, 80)}`);

    // xAI Grok Video Generation API
    const body: any = {
      model: 'grok-2-video',
      prompt: request.prompt,
      duration: request.duration ?? 5,
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
      throw new Error(`Grok Video API error: ${data.error?.message || response.statusText}`);
    }

    return {
      taskId: data.id,
      status: data.status || 'processing',
      videoUrl: data.status === 'completed' ? data.url : undefined,
      provider: this.providerId,
      modelId: 'grok-2-video',
      raw: data,
    };
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    const apiKey = this.config.get<string>('GROK_API_KEY');
    const baseUrl = this.config.get<string>('GROK_BASE_URL', 'https://api.x.ai/v1');

    const response = await fetch(`${baseUrl}/videos/generations/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    return {
      taskId,
      status: data.status || 'unknown',
      videoUrl: data.url,
      provider: this.providerId,
    };
  }
}
