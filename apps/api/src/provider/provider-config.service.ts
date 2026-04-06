import { Injectable } from '@nestjs/common';
import type { ProviderConfig } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RegisteredProvider = {
  providerId: string;
  displayName: string;
  isAvailable(): Promise<boolean>;
};

export type ProviderRuntimeState = {
  provider: string;
  runtimeProviderId: string;
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  apiKey: string;
};

export type ProviderDiagnostic = {
  provider: string;
  name: string;
  isEnabled: boolean;
  available: boolean;
  reason?: string;
};

const PROVIDER_ALIASES: Record<string, string> = {
  'openai-sora': 'sora',
  'grok-video': 'grok',
  'jimeng-video': 'jimeng',
  'qwen-voice': 'qwen',
  'aliyun-wan': 'aliyun_wan',
  'aliyun-r2v': 'aliyun_wan',
  'aliyun-ims': 'aliyun_ims',
  'aliyun-videoretalk': 'aliyun_videoretalk',
};

@Injectable()
export class ProviderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  getCanonicalProviderId(providerId: string): string {
    return PROVIDER_ALIASES[providerId] ?? providerId;
  }

  async getRuntimeState(providerId: string): Promise<ProviderRuntimeState> {
    const states = await this.getAllRuntimeState([providerId]);
    return states.get(providerId)!;
  }

  async getAllRuntimeState(providerIds: string[]): Promise<Map<string, ProviderRuntimeState>> {
    const canonicalProviderIds = [...new Set(providerIds.map((providerId) => this.getCanonicalProviderId(providerId)))];
    const configs = canonicalProviderIds.length > 0
      ? await this.prisma.providerConfig.findMany({
        where: { provider: { in: canonicalProviderIds } },
      })
      : [];

    const configByProvider = new Map(configs.map((config) => [config.provider, config]));

    return new Map(
      providerIds.map((runtimeProviderId) => {
        const provider = this.getCanonicalProviderId(runtimeProviderId);
        const config = configByProvider.get(provider);

        return [runtimeProviderId, this.buildRuntimeState(runtimeProviderId, config)];
      }),
    );
  }

  async listPublicImageProviders(providers: RegisteredProvider[]): Promise<{ id: string; name: string }[]> {
    return this.listPublicProviders(providers);
  }

  async listPublicVideoProviders(providers: RegisteredProvider[]): Promise<{ id: string; name: string }[]> {
    return this.listPublicProviders(providers);
  }

  async listAdminProviderDiagnostics(providers: RegisteredProvider[]): Promise<ProviderDiagnostic[]> {
    const states = await this.getAllRuntimeState(providers.map((provider) => provider.providerId));
    const rows = await Promise.all(
      providers.map(async (provider) => {
        const runtimeState = states.get(provider.providerId)!;
        const available = runtimeState.isEnabled ? await provider.isAvailable() : false;

        return {
          provider: runtimeState.provider,
          name: runtimeState.name || provider.displayName,
          isEnabled: runtimeState.isEnabled,
          available,
        };
      }),
    );

    const diagnostics = new Map<string, ProviderDiagnostic>();

    for (const row of rows) {
      const existing = diagnostics.get(row.provider);

      if (!existing) {
        diagnostics.set(row.provider, {
          provider: row.provider,
          name: row.name,
          isEnabled: row.isEnabled,
          available: row.available,
        });
        continue;
      }

      existing.available = existing.available || row.available;
    }

    return [...diagnostics.values()]
      .map((diagnostic) => ({
        ...diagnostic,
        reason: !diagnostic.isEnabled
          ? 'Disabled in provider config'
          : diagnostic.available
            ? undefined
            : 'Missing required environment configuration',
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async listAdminProviderConfigs() {
    const configs = await this.prisma.providerConfig.findMany({
      orderBy: { name: 'asc' },
    });

    return configs.map((config) => ({
      id: config.id,
      name: config.name,
      provider: config.provider,
      apiKey: this.maskApiKey(config.apiKey),
      apiEndpoint: config.apiEndpoint,
      isEnabled: config.isEnabled,
      rateLimit: config.rateLimit,
      config: this.readConfig(config.config),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  }

  private async listPublicProviders(providers: RegisteredProvider[]): Promise<{ id: string; name: string }[]> {
    const states = await this.getAllRuntimeState(providers.map((provider) => provider.providerId));
    const visibleProviders = await Promise.all(
      providers.map(async (provider) => {
        const runtimeState = states.get(provider.providerId)!;

        if (!runtimeState.isEnabled) {
          return null;
        }

        return (await provider.isAvailable())
          ? { id: provider.providerId, name: provider.displayName }
          : null;
      }),
    );

    return visibleProviders.filter((provider): provider is { id: string; name: string } => provider !== null);
  }

  private buildRuntimeState(runtimeProviderId: string, config?: ProviderConfig): ProviderRuntimeState {
    return {
      provider: this.getCanonicalProviderId(runtimeProviderId),
      runtimeProviderId,
      name: config?.name || runtimeProviderId,
      isEnabled: config?.isEnabled ?? true,
      config: this.readConfig(config?.config),
      apiKey: this.maskApiKey(config?.apiKey ?? ''),
    };
  }

  private readConfig(value: ProviderConfig['config'] | undefined): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey) {
      return '';
    }

    if (apiKey.length <= 8) {
      return `${apiKey.slice(0, 2)}****${apiKey.slice(-2)}`;
    }

    return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
  }
}
