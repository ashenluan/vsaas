import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ModelConfig } from '@prisma/client';
import type { AdvancedPricingCatalogEntry, PublicPricingCatalog } from '@vsaas/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderConfigService } from '../provider/provider-config.service';
import { CREDIT_COSTS } from '../common/credit-costs';
import {
  buildPricingCatalogId,
  getSupportedPricingCatalogEntry,
  SUPPORTED_PRICING_CATALOG,
  type PricingCostUnit,
  type SupportedPricingCatalogEntry,
} from './pricing.catalog';

export type EditablePricingCatalogEntry = {
  id: string;
  persistedId: string | null;
  provider: string;
  modelId: string;
  displayName: string;
  type: SupportedPricingCatalogEntry['type'];
  creditCost: number;
  costUnit: PricingCostUnit;
  isActive: boolean;
  capabilities: Record<string, unknown> | null;
  maxDuration: number | null;
  sortOrder: number;
};

type PartialCatalogUpdate = {
  displayName?: string;
  creditCost?: number;
  costUnit?: PricingCostUnit;
  isActive?: boolean;
  capabilities?: Record<string, unknown> | null;
  maxDuration?: number | null;
  sortOrder?: number;
};

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerConfigs: ProviderConfigService,
  ) {}

  async getImageCharge(input: {
    providerId: string;
    count?: number;
    model?: string;
    resolution?: string;
    outputSize?: string;
  }) {
    const entry = await this.resolveCatalogEntry(
      this.getCanonicalProvider(input.providerId),
      this.resolveImageModelId(input),
    );

    return {
      entry,
      totalCredits: this.calculateCredits(entry, { count: input.count }),
    };
  }

  async getVideoCharge(input: {
    providerId: string;
    duration?: number;
    model?: string;
  }) {
    const entry = await this.resolveCatalogEntry(
      this.getCanonicalProvider(input.providerId),
      this.resolveVideoModelId(input),
    );

    return {
      entry,
      totalCredits: this.calculateCredits(entry, { duration: input.duration }),
    };
  }

  normalizeVideoRuntimeInput<T extends { providerId: string; model?: string; ratio?: string; aspectRatio?: string }>(input: T) {
    const provider = this.getCanonicalProvider(input.providerId);
    const normalizedModel = input.model?.toLowerCase();

    if (provider === 'sora') {
      return {
        ...input,
        model: normalizedModel === 'sora-pro' || normalizedModel === 'sora-2-pro'
          ? 'sora-2-pro'
          : 'sora-2',
        aspectRatio: input.aspectRatio ?? input.ratio,
      };
    }

    if (provider === 'veo') {
      return {
        ...input,
        model: 'veo-3.0-generate-preview',
        aspectRatio: input.aspectRatio ?? input.ratio,
      };
    }

    return {
      ...input,
      aspectRatio: input.aspectRatio ?? input.ratio,
    };
  }

  async listEditableModelCatalog(): Promise<EditablePricingCatalogEntry[]> {
    const persistedEntries = await this.getPersistedEntriesByKey();

    return SUPPORTED_PRICING_CATALOG.map((entry) =>
      this.mergeEntry(entry, persistedEntries.get(buildPricingCatalogId(entry.provider, entry.modelId))),
    );
  }

  async updateModelCatalogEntry(
    providerId: string,
    modelId: string,
    updates: PartialCatalogUpdate,
  ): Promise<EditablePricingCatalogEntry> {
    const provider = this.getCanonicalProvider(providerId);
    const defaultEntry = getSupportedPricingCatalogEntry(provider, modelId);

    if (!defaultEntry) {
      throw new NotFoundException(`Unsupported pricing catalog entry: ${provider}/${modelId}`);
    }

    const persisted = await this.prisma.modelConfig.upsert({
      where: {
        provider_modelId: {
          provider,
          modelId,
        },
      },
      update: this.toPrismaData(defaultEntry, updates),
      create: {
        provider,
        modelId,
        type: defaultEntry.type,
        ...this.toPrismaData(defaultEntry, updates),
      },
    });

    return this.mergeEntry(defaultEntry, persisted);
  }

  async getPublicPricingCatalog(): Promise<PublicPricingCatalog> {
    const models = (await this.listEditableModelCatalog())
      .filter((entry) => entry.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return {
      models,
      advanced: this.getAdvancedPricingCatalog(),
    };
  }

  private async resolveCatalogEntry(provider: string, modelId: string) {
    const defaultEntry = getSupportedPricingCatalogEntry(provider, modelId);

    if (!defaultEntry) {
      throw new NotFoundException(`Unsupported pricing request: ${provider}/${modelId}`);
    }

    const persistedEntries = await this.getPersistedEntriesByKey();
    return this.mergeEntry(defaultEntry, persistedEntries.get(buildPricingCatalogId(provider, modelId)));
  }

  private async getPersistedEntriesByKey() {
    const rows = await this.prisma.modelConfig.findMany();
    return new Map(rows.map((row) => [buildPricingCatalogId(row.provider, row.modelId), row]));
  }

  private mergeEntry(
    defaultEntry: SupportedPricingCatalogEntry,
    persisted?: ModelConfig,
  ): EditablePricingCatalogEntry {
    return {
      id: buildPricingCatalogId(defaultEntry.provider, defaultEntry.modelId),
      persistedId: persisted?.id ?? null,
      provider: defaultEntry.provider,
      modelId: defaultEntry.modelId,
      displayName: persisted?.displayName ?? defaultEntry.displayName,
      type: (persisted?.type ?? defaultEntry.type) as SupportedPricingCatalogEntry['type'],
      creditCost: persisted?.creditCost ?? defaultEntry.creditCost,
      costUnit: (persisted?.costUnit ?? defaultEntry.costUnit) as PricingCostUnit,
      isActive: persisted?.isActive ?? defaultEntry.isActive,
      capabilities: this.readCapabilities(persisted?.capabilities) ?? defaultEntry.capabilities,
      maxDuration: persisted?.maxDuration ?? defaultEntry.maxDuration,
      sortOrder: persisted?.sortOrder ?? defaultEntry.sortOrder,
    };
  }

  private toPrismaData(defaultEntry: SupportedPricingCatalogEntry, updates: PartialCatalogUpdate) {
    const capabilities = updates.capabilities ?? defaultEntry.capabilities;
    const normalizedCapabilities = capabilities === null
      ? Prisma.JsonNull
      : capabilities as Prisma.InputJsonValue;

    return {
      displayName: updates.displayName ?? defaultEntry.displayName,
      creditCost: updates.creditCost ?? defaultEntry.creditCost,
      costUnit: updates.costUnit ?? defaultEntry.costUnit,
      isActive: updates.isActive ?? defaultEntry.isActive,
      capabilities: normalizedCapabilities,
      maxDuration: updates.maxDuration ?? defaultEntry.maxDuration,
      sortOrder: updates.sortOrder ?? defaultEntry.sortOrder,
    };
  }

  private calculateCredits(
    entry: EditablePricingCatalogEntry,
    options: { count?: number; duration?: number },
  ) {
    if (entry.costUnit === 'per_second') {
      return entry.creditCost * (options.duration ?? 5);
    }

    if (entry.costUnit === 'per_image') {
      return entry.creditCost * (options.count ?? 1);
    }

    return entry.creditCost;
  }

  private getCanonicalProvider(providerId: string) {
    return this.providerConfigs.getCanonicalProviderId(providerId);
  }

  private resolveImageModelId(input: {
    providerId: string;
    model?: string;
    resolution?: string;
    outputSize?: string;
  }) {
    const provider = this.getCanonicalProvider(input.providerId);

    if (provider === 'qwen') {
      return input.resolution === '2k' ? 'qwen-image-2k' : 'qwen-image-1k';
    }

    if (provider === 'google-imagen') {
      if (input.outputSize === '4k') return 'banana-4k';
      if (input.outputSize === '2k') return 'banana-2k';
      return 'banana-1k';
    }

    if (provider === 'jimeng') {
      return input.model === 'jimeng-4.6' ? 'jimeng-4.6' : 'jimeng-5.0';
    }

    if (provider === 'grok') {
      return 'grok-image';
    }

    if (input.model && getSupportedPricingCatalogEntry(provider, input.model)) {
      return input.model;
    }

    throw new NotFoundException(`Unsupported image pricing provider: ${provider}`);
  }

  private resolveVideoModelId(input: { providerId: string; model?: string }) {
    const provider = this.getCanonicalProvider(input.providerId);
    const normalizedModel = input.model?.toLowerCase();

    if (provider === 'sora') {
      if (normalizedModel === 'sora-pro' || normalizedModel === 'sora-2-pro') {
        return 'sora-2-pro';
      }
      return 'sora-2';
    }

    if (provider === 'veo') {
      if (normalizedModel === 'quality' || normalizedModel === 'veo-quality') return 'veo-quality';
      if (normalizedModel === 'standard' || normalizedModel === 'veo-standard') return 'veo-standard';
      return 'veo-fast';
    }

    if (provider === 'jimeng') {
      return 'seedance-2.0';
    }

    if (provider === 'grok') {
      return 'grok-video';
    }

    if (provider === 'aliyun_wan') {
      return 'wan2.2-s2v';
    }

    if (input.model && getSupportedPricingCatalogEntry(provider, input.model)) {
      return input.model;
    }

    throw new NotFoundException(`Unsupported video pricing provider: ${provider}`);
  }

  private readCapabilities(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getAdvancedPricingCatalog(): AdvancedPricingCatalogEntry[] {
    return [
      { key: 'style-copy', displayName: '一键仿图', creditCost: CREDIT_COSTS.STYLE_COPY, costUnit: 'per_image' },
      { key: 'text-edit', displayName: '无损改字', creditCost: CREDIT_COSTS.TEXT_EDIT, costUnit: 'per_image' },
      { key: 'handheld-product', displayName: '手持产品', creditCost: CREDIT_COSTS.HANDHELD_PRODUCT, costUnit: 'per_image' },
      { key: 'multi-fusion', displayName: '多图融合', creditCost: CREDIT_COSTS.MULTI_FUSION, costUnit: 'per_image' },
      { key: 'virtual-tryon', displayName: '一键换装', creditCost: CREDIT_COSTS.VIRTUAL_TRYON, costUnit: 'per_image' },
      { key: 'virtual-tryon-plus', displayName: '一键换装 Plus', creditCost: CREDIT_COSTS.VIRTUAL_TRYON_PLUS, costUnit: 'per_image' },
      { key: 'inpaint', displayName: '局部编辑', creditCost: CREDIT_COSTS.INPAINT, costUnit: 'per_image' },
      { key: 'image-edit', displayName: '图像编辑', creditCost: CREDIT_COSTS.IMAGE_EDIT, costUnit: 'per_image' },
      { key: 'image-edit-pro', displayName: '图像编辑 Pro', creditCost: CREDIT_COSTS.IMAGE_EDIT_PRO, costUnit: 'per_image' },
      { key: 'storyboard-compose', displayName: '一键成片', creditCost: CREDIT_COSTS.STORYBOARD_COMPOSE, costUnit: 'per_job' },
    ];
  }
}
