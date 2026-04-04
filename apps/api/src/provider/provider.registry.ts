import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QwenImageProvider } from './qwen/qwen-image.provider';
import { GrokImageProvider } from './grok/grok-image.provider';
import { GoogleImagenProvider } from './google-imagen/google-imagen.provider';
import { JimengImageProvider } from './jimeng/jimeng-image.provider';
import { SoraVideoProvider } from './sora/sora-video.provider';
import { GrokVideoProvider } from './grok/grok-video.provider';
import { JimengVideoProvider } from './jimeng/jimeng-video.provider';
import { VeoVideoProvider } from './veo/veo-video.provider';
import { QwenVoiceProvider } from './qwen/qwen-voice.provider';
import { WanS2VProvider } from './aliyun-wan/wan-s2v.provider';
import { WanR2VProvider } from './aliyun-wan/wan-r2v.provider';
import { AliyunIMSProvider } from './aliyun-ims/ims-compose.provider';

export interface ImageProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  generateImage(request: any): Promise<any>;
  estimateCost(request: any): number;
}

export interface VideoProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  generateVideo(request: any): Promise<any>;
  estimateCost(request: any): number;
}

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private imageProviders = new Map<string, ImageProvider>();
  private videoProviders = new Map<string, VideoProvider>();

  constructor(
    private readonly config: ConfigService,
    private readonly qwen: QwenImageProvider,
    private readonly grok: GrokImageProvider,
    private readonly googleImagen: GoogleImagenProvider,
    private readonly jimeng: JimengImageProvider,
    private readonly sora: SoraVideoProvider,
    private readonly grokVideo: GrokVideoProvider,
    private readonly jimengVideo: JimengVideoProvider,
    private readonly veo: VeoVideoProvider,
    public readonly voiceProvider: QwenVoiceProvider,
    public readonly digitalHumanProvider: WanS2VProvider,
    public readonly r2vProvider: WanR2VProvider,
    public readonly batchComposeProvider: AliyunIMSProvider,
  ) {}

  async onModuleInit() {
    this.registerImageProvider(this.qwen);
    this.registerImageProvider(this.grok);
    this.registerImageProvider(this.googleImagen);
    this.registerImageProvider(this.jimeng);
    this.registerVideoProvider(this.sora);
    this.registerVideoProvider(this.grokVideo);
    this.registerVideoProvider(this.jimengVideo);
    this.registerVideoProvider(this.veo);
    this.registerVideoProvider(this.r2vProvider as any);
  }

  registerImageProvider(provider: ImageProvider) {
    this.imageProviders.set(provider.providerId, provider);
  }

  registerVideoProvider(provider: VideoProvider) {
    this.videoProviders.set(provider.providerId, provider);
  }

  getImageProvider(id: string): ImageProvider | undefined {
    return this.imageProviders.get(id);
  }

  getVideoProvider(id: string): VideoProvider | undefined {
    return this.videoProviders.get(id);
  }

  async getAvailableImageProviders(): Promise<ImageProvider[]> {
    const providers = Array.from(this.imageProviders.values());
    const checks = await Promise.all(providers.map(async (p) => ({ provider: p, available: await p.isAvailable() })));
    return checks.filter((c) => c.available).map((c) => c.provider);
  }

  async getAvailableVideoProviders(): Promise<VideoProvider[]> {
    const providers = Array.from(this.videoProviders.values());
    const checks = await Promise.all(providers.map(async (p) => ({ provider: p, available: await p.isAvailable() })));
    return checks.filter((c) => c.available).map((c) => c.provider);
  }

  listImageProviders(): { id: string; name: string }[] {
    return Array.from(this.imageProviders.values()).map((p) => ({
      id: p.providerId,
      name: p.displayName,
    }));
  }

  listVideoProviders(): { id: string; name: string }[] {
    return Array.from(this.videoProviders.values()).map((p) => ({
      id: p.providerId,
      name: p.displayName,
    }));
  }
}
