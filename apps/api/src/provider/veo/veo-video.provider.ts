import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProvider } from '../provider.registry';
import { retryFetch } from '../retry-fetch';

@Injectable()
export class VeoVideoProvider implements VideoProvider {
  readonly providerId = 'veo';
  readonly displayName = 'Google Veo';
  private readonly logger = new Logger(VeoVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('GOOGLE_API_KEY');
  }

  estimateCost(request: any): number {
    const duration = request.duration ?? 5;
    return duration * 10;
  }

  async generateVideo(request: any): Promise<any> {
    const apiKey = this.config.get<string>('GOOGLE_API_KEY');
    const model = request.model || 'veo-3.0-generate-preview';

    this.logger.log(`Generating video with Veo: ${request.prompt?.slice(0, 80)}`);

    // Google Generative Language API for Veo
    // Docs: https://ai.google.dev/gemini-api/docs/video-generation
    const body: any = {
      instances: [
        {
          prompt: request.prompt,
        },
      ],
      parameters: {
        aspectRatio: request.aspectRatio ?? '16:9',
        personGeneration: 'allow_all',
      },
    };

    if (request.referenceImage) {
      body.instances[0].image = {
        bytesBase64Encoded: request.referenceImage,
      };
    }

    const response = await retryFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Veo API error: ${data.error?.message || response.statusText}`);
    }

    // Veo returns a long-running operation
    return {
      taskId: data.name,
      status: data.done ? 'completed' : 'processing',
      videoUrl: data.response?.generatedSamples?.[0]?.video?.uri,
      provider: this.providerId,
      modelId: model,
      raw: data,
    };
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    const apiKey = this.config.get<string>('GOOGLE_API_KEY');

    // Poll the long-running operation
    const response = await retryFetch(
      `https://generativelanguage.googleapis.com/v1beta/${taskId}?key=${apiKey}`,
    );

    const data: any = await response.json();

    return {
      taskId,
      status: data.done ? 'completed' : 'processing',
      videoUrl: data.response?.generatedSamples?.[0]?.video?.uri,
      provider: this.providerId,
    };
  }
}
