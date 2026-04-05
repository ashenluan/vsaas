import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PricingService } from './pricing.service';

function createMockPrisma() {
  return {
    modelConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

function createModelConfig(overrides: Partial<any> = {}) {
  return {
    id: 'cfg-1',
    provider: 'qwen',
    modelId: 'qwen-image-2k',
    displayName: '通义万相 2K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 9,
    costUnit: 'per_image',
    isActive: true,
    capabilities: { resolution: '2k' },
    maxDuration: null,
    sortOrder: 20,
    ...overrides,
  };
}

describe('PricingService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let providerConfigs: { getCanonicalProviderId: ReturnType<typeof vi.fn> };
  let service: PricingService;

  beforeEach(() => {
    prisma = createMockPrisma();
    providerConfigs = {
      getCanonicalProviderId: vi.fn((providerId: string) => {
        const aliases: Record<string, string> = {
          'openai-sora': 'sora',
          'grok-video': 'grok',
          'jimeng-video': 'jimeng',
        };
        return aliases[providerId] ?? providerId;
      }),
    };

    service = new PricingService(prisma as any, providerConfigs as any);
  });

  it('resolves image pricing variants from editable catalog rows', async () => {
    prisma.modelConfig.findMany.mockResolvedValue([
      createModelConfig({
        provider: 'qwen',
        modelId: 'qwen-image-2k',
        creditCost: 7,
      }),
    ]);

    const charge = await service.getImageCharge({
      providerId: 'qwen',
      count: 2,
      resolution: '2k',
    });

    expect(charge.totalCredits).toBe(14);
    expect(charge.entry).toEqual(
      expect.objectContaining({
        provider: 'qwen',
        modelId: 'qwen-image-2k',
        creditCost: 7,
      }),
    );
  });

  it('falls back to built-in defaults when an editable row is missing', async () => {
    prisma.modelConfig.findMany.mockResolvedValue([]);

    const charge = await service.getVideoCharge({
      providerId: 'openai-sora',
      model: 'sora-pro',
      duration: 5,
    });

    expect(charge.totalCredits).toBe(100);
    expect(charge.entry).toEqual(
      expect.objectContaining({
        provider: 'sora',
        modelId: 'sora-2-pro',
        creditCost: 20,
        costUnit: 'per_second',
      }),
    );
  });

  it('merges supported catalog defaults with persisted overrides for admin screens', async () => {
    prisma.modelConfig.findMany.mockResolvedValue([
      createModelConfig({
        id: 'cfg-banana',
        provider: 'google-imagen',
        modelId: 'banana-4k',
        displayName: 'Nano Banana 4K',
        creditCost: 17,
        isActive: false,
        capabilities: { outputSize: '4k' },
      }),
    ]);

    const catalog = await service.listEditableModelCatalog();
    const banana4k = catalog.find(
      (entry) => entry.provider === 'google-imagen' && entry.modelId === 'banana-4k',
    );
    const qwen1k = catalog.find(
      (entry) => entry.provider === 'qwen' && entry.modelId === 'qwen-image-1k',
    );

    expect(banana4k).toEqual(
      expect.objectContaining({
        id: 'google-imagen:banana-4k',
        persistedId: 'cfg-banana',
        creditCost: 17,
        isActive: false,
      }),
    );
    expect(qwen1k).toEqual(
      expect.objectContaining({
        provider: 'qwen',
        modelId: 'qwen-image-1k',
      }),
    );
  });

  it('upserts editable catalog changes against the canonical provider key', async () => {
    prisma.modelConfig.upsert.mockResolvedValue(
      createModelConfig({
        id: 'cfg-sora-pro',
        provider: 'sora',
        modelId: 'sora-2-pro',
        displayName: 'Sora Pro',
        type: 'TEXT_TO_VIDEO',
        creditCost: 25,
        costUnit: 'per_second',
        isActive: false,
        maxDuration: 25,
      }),
    );

    const updated = await service.updateModelCatalogEntry('sora', 'sora-2-pro', {
      displayName: 'Sora Pro',
      creditCost: 25,
      isActive: false,
      maxDuration: 25,
    });

    expect(prisma.modelConfig.upsert).toHaveBeenCalledWith({
      where: {
        provider_modelId: {
          provider: 'sora',
          modelId: 'sora-2-pro',
        },
      },
      update: expect.objectContaining({
        displayName: 'Sora Pro',
        creditCost: 25,
        isActive: false,
        maxDuration: 25,
      }),
      create: expect.objectContaining({
        provider: 'sora',
        modelId: 'sora-2-pro',
        displayName: 'Sora Pro',
        creditCost: 25,
        isActive: false,
        maxDuration: 25,
      }),
    });
    expect(updated).toEqual(
      expect.objectContaining({
        id: 'sora:sora-2-pro',
        persistedId: 'cfg-sora-pro',
        creditCost: 25,
        isActive: false,
      }),
    );
  });

  it('builds a public pricing catalog from active models plus advanced tool cards', async () => {
    prisma.modelConfig.findMany.mockResolvedValue([
      createModelConfig({
        id: 'cfg-banana-2k',
        provider: 'google-imagen',
        modelId: 'banana-2k',
        displayName: 'Nano Banana 2K',
        creditCost: 12,
        isActive: true,
      }),
      createModelConfig({
        id: 'cfg-grok-image',
        provider: 'grok',
        modelId: 'grok-image',
        displayName: 'Grok 图像',
        creditCost: 8,
        isActive: false,
      }),
    ]);

    const catalog = await service.getPublicPricingCatalog();

    expect(catalog.models.find((entry) => entry.id === 'google-imagen:banana-2k')).toEqual(
      expect.objectContaining({
        creditCost: 12,
      }),
    );
    expect(catalog.models.some((entry) => entry.id === 'grok:grok-image')).toBe(false);
    expect(catalog.advanced.find((entry) => entry.key === 'virtual-tryon')).toEqual(
      expect.objectContaining({
        creditCost: 8,
        costUnit: 'per_image',
      }),
    );
    expect(catalog.advanced.find((entry) => entry.key === 'storyboard-compose')).toEqual(
      expect.objectContaining({
        creditCost: 10,
        costUnit: 'per_job',
      }),
    );
  });

  it('normalizes frontend video model variants into provider runtime model ids', () => {
    expect(
      service.normalizeVideoRuntimeInput({
        providerId: 'openai-sora',
        model: 'sora-pro',
        aspectRatio: '9:16',
      }),
    ).toEqual(
      expect.objectContaining({
        model: 'sora-2-pro',
        aspectRatio: '9:16',
      }),
    );

    expect(
      service.normalizeVideoRuntimeInput({
        providerId: 'veo',
        model: 'quality',
      }),
    ).toEqual(
      expect.objectContaining({
        model: 'veo-3.0-generate-preview',
      }),
    );
  });
});
