'use client';

import { useEffect, useState } from 'react';
import type { PublicPricingCatalog } from '@vsaas/shared-types';
import { generationApi } from './api';

export function useGenerationPricingCatalog() {
  const [catalog, setCatalog] = useState<PublicPricingCatalog | null>(null);

  useEffect(() => {
    let active = true;

    generationApi.getPricingCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, []);

  return catalog;
}

export function estimateModelCredits(
  catalog: PublicPricingCatalog | null,
  provider: string,
  modelId: string,
  options: { count?: number; duration?: number } = {},
) {
  const entry = catalog?.models.find((item) => item.provider === provider && item.modelId === modelId);

  if (!entry) {
    return null;
  }

  if (entry.costUnit === 'per_second') {
    return entry.creditCost * (options.duration ?? 5);
  }

  if (entry.costUnit === 'per_image') {
    return entry.creditCost * (options.count ?? 1);
  }

  return entry.creditCost;
}

export function getAdvancedCredits(catalog: PublicPricingCatalog | null, key: string) {
  return catalog?.advanced.find((entry) => entry.key === key)?.creditCost ?? null;
}

export function estimateAdvancedCredits(
  catalog: PublicPricingCatalog | null,
  key: string,
  options: { count?: number } = {},
) {
  const entry = catalog?.advanced.find((item) => item.key === key);

  if (!entry) {
    return null;
  }

  return entry.creditCost * (options.count ?? 1);
}
