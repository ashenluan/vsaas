import { Injectable, OnModuleInit } from '@nestjs/common';
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
import { ProviderConfigService, RegisteredProvider } from './provider-config.service';

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
    private readonly providerConfigs: ProviderConfigService,
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

  async getImageProviderStatus(id: string): Promise<{
    provider?: ImageProvider;
    isEnabled: boolean;
    available: boolean;
    configProvider: string;
  }> {
    return this.getProviderStatus(this.imageProviders, id);
  }

  async getVideoProviderStatus(id: string): Promise<{
    provider?: VideoProvider;
    isEnabled: boolean;
    available: boolean;
    configProvider: string;
  }> {
    return this.getProviderStatus(this.videoProviders, id);
  }

  async getAvailableImageProviders(): Promise<ImageProvider[]> {
    return this.filterAvailableProviders(this.getRegisteredImageProviders());
  }

  async getAvailableVideoProviders(): Promise<VideoProvider[]> {
    return this.filterAvailableProviders(this.getRegisteredVideoProviders());
  }

  async listPublicImageProviders(): Promise<{ id: string; name: string }[]> {
    return this.providerConfigs.listPublicImageProviders(this.getRegisteredImageProviders());
  }

  async listPublicVideoProviders(): Promise<{ id: string; name: string }[]> {
    return this.providerConfigs.listPublicVideoProviders(this.getRegisteredVideoProviders());
  }

  async listAdminProviderDiagnostics() {
    return this.providerConfigs.listAdminProviderDiagnostics(this.getRegisteredAdminProviders());
  }

  private getRegisteredImageProviders(): ImageProvider[] {
    return Array.from(this.imageProviders.values());
  }

  private getRegisteredVideoProviders(): VideoProvider[] {
    return Array.from(this.videoProviders.values());
  }

  private getRegisteredAdminProviders(): RegisteredProvider[] {
    return [
      ...this.getRegisteredImageProviders(),
      ...this.getRegisteredVideoProviders(),
      this.voiceProvider,
      this.digitalHumanProvider,
      this.batchComposeProvider,
    ];
  }

  private async filterAvailableProviders<T extends RegisteredProvider>(providers: T[]): Promise<T[]> {
    const states = await this.providerConfigs.getAllRuntimeState(providers.map((provider) => provider.providerId));
    const availableProviders: T[] = [];

    for (const provider of providers) {
      const state = states.get(provider.providerId)!;

      if (!state.isEnabled) {
        continue;
      }

      if (await provider.isAvailable()) {
        availableProviders.push(provider);
      }
    }

    return availableProviders;
  }

  private async getProviderStatus<T extends RegisteredProvider>(
    providers: Map<string, T>,
    id: string,
  ): Promise<{
    provider?: T;
    isEnabled: boolean;
    available: boolean;
    configProvider: string;
  }> {
    const provider = providers.get(id);
    const runtimeState = await this.providerConfigs.getRuntimeState(id);

    if (!provider) {
      return {
        provider: undefined,
        isEnabled: runtimeState.isEnabled,
        available: false,
        configProvider: runtimeState.provider,
      };
    }

    if (!runtimeState.isEnabled) {
      return {
        provider,
        isEnabled: false,
        available: false,
        configProvider: runtimeState.provider,
      };
    }

    return {
      provider,
      isEnabled: true,
      available: await provider.isAvailable(),
      configProvider: runtimeState.provider,
    };
  }
}
