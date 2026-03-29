import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageProvider } from '../provider.registry';

@Injectable()
export class GoogleImagenProvider implements ImageProvider {
  readonly providerId = 'google-imagen';
  readonly displayName = 'Google Imagen';
  private readonly logger = new Logger(GoogleImagenProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('GOOGLE_IMAGEN_API_KEY');
  }

  estimateCost(request: any): number {
    return (request.count ?? 1) * 10;
  }

  async generateImage(request: any): Promise<any> {
    const apiKey = this.config.get<string>('GOOGLE_IMAGEN_API_KEY');

    this.logger.log(`Generating image with Google Imagen: ${request.prompt}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: request.prompt }],
          parameters: {
            sampleCount: request.count ?? 1,
            aspectRatio: this.getAspectRatio(request.width, request.height),
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Google Imagen error: ${data.error?.message || response.statusText}`);
    }

    return {
      images: data.predictions?.map((pred: any) => ({
        url: `data:image/png;base64,${pred.bytesBase64Encoded}`,
        width: request.width,
        height: request.height,
      })) ?? [],
      provider: this.providerId,
      modelId: 'imagen-3.0-generate-002',
      usage: { credits: this.estimateCost(request) },
    };
  }

  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (ratio > 1.4) return '16:9';
    if (ratio > 1.1) return '4:3';
    if (ratio < 0.7) return '9:16';
    if (ratio < 0.9) return '3:4';
    return '1:1';
  }
}
