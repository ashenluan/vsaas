import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageProvider } from '../provider.registry';
import { retryFetch } from '../retry-fetch';

@Injectable()
export class GrokImageProvider implements ImageProvider {
  readonly providerId = 'grok';
  readonly displayName = 'Grok Imagine';
  private readonly logger = new Logger(GrokImageProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('GROK_API_KEY');
  }

  estimateCost(request: any): number {
    return (request.count ?? 1) * 8;
  }

  async generateImage(request: any): Promise<any> {
    const apiKey = this.config.get<string>('GROK_API_KEY');
    const baseUrl = this.config.get<string>('GROK_BASE_URL', 'https://api.x.ai/v1');

    this.logger.log(`Generating image with Grok: ${request.prompt?.slice(0, 80)}`);

    // xAI Grok Image Generation API
    // Docs: https://docs.x.ai/api/endpoints#create-images
    const response = await retryFetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-image',
        prompt: request.prompt,
        n: request.count ?? 1,
        response_format: 'url',
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Grok API error: ${data.error?.message || response.statusText}`);
    }

    return {
      images: data.data?.map((img: any) => ({
        url: img.url,
        revisedPrompt: img.revised_prompt,
      })) ?? [],
      provider: this.providerId,
      modelId: 'grok-2-image',
      usage: { credits: this.estimateCost(request) },
    };
  }
}
