export type PricingCostUnit = 'per_image' | 'per_second' | 'per_job';

export interface PricingCatalogModelEntry {
  id: string;
  persistedId: string | null;
  provider: string;
  modelId: string;
  displayName: string;
  type: string;
  creditCost: number;
  costUnit: PricingCostUnit;
  isActive: boolean;
  capabilities: Record<string, unknown> | null;
  maxDuration: number | null;
  sortOrder: number;
}

export interface AdvancedPricingCatalogEntry {
  key: string;
  displayName: string;
  creditCost: number;
  costUnit: PricingCostUnit;
  description?: string;
}

export interface PublicPricingCatalog {
  models: PricingCatalogModelEntry[];
  advanced: AdvancedPricingCatalogEntry[];
}
