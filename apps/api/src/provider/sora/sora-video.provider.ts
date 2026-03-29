import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProvider } from '../provider.registry';

@Injectable()
export class SoraVideoProvider implements VideoProvider {
  readonly providerId = 'openai-sora';
  readonly displayName = 'OpenAI Sora';
  private readonly logger = new Logger(SoraVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('OPENAI_API_KEY');
  }

  estimateCost(request: any): number {
    const duration = request.duration ?? 5;
    return duration * 20;
  }

  async generateVideo(request: any): Promise<any> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || '';
    const model = request.model || 'sora-2';

    this.logger.log(`Generating video with Sora (${model}): ${request.prompt?.slice(0, 80)}`);

    // Sora API: POST /v1/videos to create, then poll GET /v1/videos/{id}
    // Docs: https://developers.openai.com/api/docs/guides/video-generation
    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: request.prompt,
        seconds: request.duration ?? 5,
        size: this.getSize(request.resolution, request.aspectRatio),
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Sora API error: ${data.error?.message || response.statusText}`);
    }

    return {
      taskId: data.id,
      status: data.status || 'queued',
      provider: this.providerId,
      modelId: model,
      raw: data,
    };
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || '';

    const response = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Sora status error: ${data.error?.message || response.statusText}`);
    }

    let videoUrl: string | undefined;

    // When completed, fetch the video content URL
    if (data.status === 'completed') {
      videoUrl = await this.getVideoUrl(apiKey, taskId);
    }

    return {
      taskId,
      status: data.status,
      videoUrl,
      provider: this.providerId,
    };
  }

  private async getVideoUrl(apiKey: string, videoId: string): Promise<string | undefined> {
    try {
      const response = await fetch(
        `https://api.openai.com/v1/videos/${videoId}/content`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } },
      );

      if (!response.ok) return undefined;

      const data: any = await response.json();
      return data.url;
    } catch {
      return undefined;
    }
  }

  private getSize(resolution?: string, aspectRatio?: string): string {
    if (resolution === '720p') {
      if (aspectRatio === '9:16') return '720x1280';
      return '1280x720';
    }
    // Default 1080p
    if (aspectRatio === '9:16') return '1080x1920';
    return '1920x1080';
  }
}
