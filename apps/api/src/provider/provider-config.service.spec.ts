import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderConfigService } from './provider-config.service';

function makeProviderConfig(overrides: Partial<any> = {}) {
  return {
    id: 'cfg-1',
    name: 'Grok',
    provider: 'grok',
    apiKey: 'sk-12345678',
    apiEndpoint: 'https://api.example.com',
    isEnabled: true,
    rateLimit: null,
    config: { mode: 'fast' },
    createdAt: new Date('2026-04-06T00:00:00.000Z'),
    updatedAt: new Date('2026-04-06T00:00:00.000Z'),
    ...overrides,
  };
}

function makeRegisteredProvider(
  providerId: string,
  displayName: string,
  available: boolean,
) {
  return {
    providerId,
    displayName,
    isAvailable: vi.fn().mockResolvedValue(available),
  };
}

describe('ProviderConfigService', () => {
  let prisma: {
    providerConfig: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: ProviderConfigService;

  beforeEach(() => {
    prisma = {
      providerConfig: {
        findMany: vi.fn(),
      },
    };

    service = new ProviderConfigService(prisma as any);
  });

  it('filters disabled providers from public image list', async () => {
    prisma.providerConfig.findMany.mockResolvedValue([
      makeProviderConfig({ provider: 'grok', isEnabled: false }),
    ]);

    const providers = await service.listPublicImageProviders([
      makeRegisteredProvider('grok', 'Grok Imagine', true),
    ]);

    expect(providers).toEqual([]);
  });

  it('applies canonical provider aliases when filtering public providers', async () => {
    prisma.providerConfig.findMany.mockResolvedValue([
      makeProviderConfig({ provider: 'sora', isEnabled: false, name: 'OpenAI Sora' }),
    ]);

    const providers = await service.listPublicVideoProviders([
      makeRegisteredProvider('openai-sora', 'OpenAI Sora', true),
    ]);

    expect(providers).toEqual([]);
  });

  it('marks enabled providers without env secrets as unavailable in diagnostics', async () => {
    prisma.providerConfig.findMany.mockResolvedValue([
      makeProviderConfig({ provider: 'grok', isEnabled: true }),
    ]);

    const diagnostics = await service.listAdminProviderDiagnostics([
      makeRegisteredProvider('grok', 'Grok Imagine', false),
    ]);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        provider: 'grok',
        isEnabled: true,
        available: false,
        reason: 'Missing required environment configuration',
      }),
    ]);
  });

  it('returns admin configs with provider instead of phantom providerId', async () => {
    prisma.providerConfig.findMany.mockResolvedValue([
      makeProviderConfig({ provider: 'grok' }),
    ]);

    const configs = await service.listAdminProviderConfigs();

    expect(configs).toEqual([
      expect.objectContaining({
        provider: 'grok',
        apiKey: 'sk-1****5678',
      }),
    ]);
    expect('providerId' in configs[0]).toBe(false);
  });
});
