import type { JobType } from '@prisma/client';

export type PricingCostUnit = 'per_image' | 'per_second' | 'per_job';

export type SupportedPricingCatalogEntry = {
  provider: string;
  modelId: string;
  displayName: string;
  type: JobType;
  creditCost: number;
  costUnit: PricingCostUnit;
  isActive: boolean;
  capabilities: Record<string, unknown> | null;
  maxDuration: number | null;
  sortOrder: number;
};

const makeEntry = (
  entry: Omit<SupportedPricingCatalogEntry, 'isActive' | 'capabilities' | 'maxDuration'> & {
    capabilities?: Record<string, unknown> | null;
    maxDuration?: number | null;
  },
): SupportedPricingCatalogEntry => ({
  ...entry,
  isActive: true,
  capabilities: entry.capabilities ?? null,
  maxDuration: entry.maxDuration ?? null,
});

export const SUPPORTED_PRICING_CATALOG: SupportedPricingCatalogEntry[] = [
  makeEntry({
    provider: 'grok',
    modelId: 'grok-image',
    displayName: 'Grok 图像',
    type: 'TEXT_TO_IMAGE',
    creditCost: 8,
    costUnit: 'per_image',
    capabilities: { group: 'grok-image', runtimeProviderId: 'grok' },
    sortOrder: 10,
  }),
  makeEntry({
    provider: 'jimeng',
    modelId: 'jimeng-5.0',
    displayName: '即梦 5.0',
    type: 'TEXT_TO_IMAGE',
    creditCost: 6,
    costUnit: 'per_image',
    capabilities: { group: 'jimeng-image', runtimeProviderId: 'jimeng' },
    sortOrder: 20,
  }),
  makeEntry({
    provider: 'jimeng',
    modelId: 'jimeng-4.6',
    displayName: '即梦 4.6',
    type: 'TEXT_TO_IMAGE',
    creditCost: 6,
    costUnit: 'per_image',
    capabilities: { group: 'jimeng-image', runtimeProviderId: 'jimeng' },
    sortOrder: 21,
  }),
  makeEntry({
    provider: 'qwen',
    modelId: 'qwen-image-1k',
    displayName: '通义万相 1K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 5,
    costUnit: 'per_image',
    capabilities: { group: 'qwen-image', resolution: '1k', runtimeProviderId: 'qwen' },
    sortOrder: 30,
  }),
  makeEntry({
    provider: 'qwen',
    modelId: 'qwen-image-2k',
    displayName: '通义万相 2K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 5,
    costUnit: 'per_image',
    capabilities: { group: 'qwen-image', resolution: '2k', runtimeProviderId: 'qwen' },
    sortOrder: 31,
  }),
  makeEntry({
    provider: 'google-imagen',
    modelId: 'banana-1k',
    displayName: 'Nano Banana 1K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 10,
    costUnit: 'per_image',
    capabilities: { group: 'banana-image', outputSize: '1k', runtimeProviderId: 'google-imagen' },
    sortOrder: 40,
  }),
  makeEntry({
    provider: 'google-imagen',
    modelId: 'banana-2k',
    displayName: 'Nano Banana 2K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 10,
    costUnit: 'per_image',
    capabilities: { group: 'banana-image', outputSize: '2k', runtimeProviderId: 'google-imagen' },
    sortOrder: 41,
  }),
  makeEntry({
    provider: 'google-imagen',
    modelId: 'banana-4k',
    displayName: 'Nano Banana 4K',
    type: 'TEXT_TO_IMAGE',
    creditCost: 10,
    costUnit: 'per_image',
    capabilities: { group: 'banana-image', outputSize: '4k', runtimeProviderId: 'google-imagen' },
    sortOrder: 42,
  }),
  makeEntry({
    provider: 'grok',
    modelId: 'grok-video',
    displayName: 'Grok Aurora 视频',
    type: 'TEXT_TO_VIDEO',
    creditCost: 5,
    costUnit: 'per_second',
    capabilities: { group: 'grok-video', runtimeProviderId: 'grok-video' },
    maxDuration: 10,
    sortOrder: 50,
  }),
  makeEntry({
    provider: 'jimeng',
    modelId: 'seedance-2.0',
    displayName: 'Seedance 2.0',
    type: 'TEXT_TO_VIDEO',
    creditCost: 5,
    costUnit: 'per_second',
    capabilities: { group: 'jimeng-video', runtimeProviderId: 'jimeng-video' },
    maxDuration: 15,
    sortOrder: 60,
  }),
  makeEntry({
    provider: 'sora',
    modelId: 'sora-2',
    displayName: 'Sora',
    type: 'TEXT_TO_VIDEO',
    creditCost: 20,
    costUnit: 'per_second',
    capabilities: { group: 'sora-video', runtimeProviderId: 'openai-sora' },
    maxDuration: 20,
    sortOrder: 70,
  }),
  makeEntry({
    provider: 'sora',
    modelId: 'sora-2-pro',
    displayName: 'Sora Pro',
    type: 'TEXT_TO_VIDEO',
    creditCost: 20,
    costUnit: 'per_second',
    capabilities: { group: 'sora-video', runtimeProviderId: 'openai-sora' },
    maxDuration: 25,
    sortOrder: 71,
  }),
  makeEntry({
    provider: 'veo',
    modelId: 'veo-fast',
    displayName: 'Veo 快速模式',
    type: 'TEXT_TO_VIDEO',
    creditCost: 50,
    costUnit: 'per_job',
    capabilities: { group: 'veo-video', variant: 'fast', runtimeProviderId: 'veo' },
    maxDuration: 5,
    sortOrder: 80,
  }),
  makeEntry({
    provider: 'veo',
    modelId: 'veo-standard',
    displayName: 'Veo 标准模式',
    type: 'TEXT_TO_VIDEO',
    creditCost: 50,
    costUnit: 'per_job',
    capabilities: { group: 'veo-video', variant: 'standard', runtimeProviderId: 'veo' },
    maxDuration: 5,
    sortOrder: 81,
  }),
  makeEntry({
    provider: 'veo',
    modelId: 'veo-quality',
    displayName: 'Veo 质量模式',
    type: 'TEXT_TO_VIDEO',
    creditCost: 50,
    costUnit: 'per_job',
    capabilities: { group: 'veo-video', variant: 'quality', runtimeProviderId: 'veo' },
    maxDuration: 5,
    sortOrder: 82,
  }),
  makeEntry({
    provider: 'aliyun_wan',
    modelId: 'wan2.2-s2v',
    displayName: '万相数字人',
    type: 'DIGITAL_HUMAN_VIDEO',
    creditCost: 1,
    costUnit: 'per_second',
    capabilities: { group: 'digital-human', runtimeProviderId: 'aliyun-wan' },
    sortOrder: 90,
  }),
];

export function buildPricingCatalogId(provider: string, modelId: string) {
  return `${provider}:${modelId}`;
}

export function getSupportedPricingCatalogEntry(provider: string, modelId: string) {
  return SUPPORTED_PRICING_CATALOG.find(
    (entry) => entry.provider === provider && entry.modelId === modelId,
  );
}
