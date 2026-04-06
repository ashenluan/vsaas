import { describe, expect, it } from 'vitest';
import type { PublicPricingCatalog } from '@vsaas/shared-types';
import { estimateAdvancedCredits } from './generation-pricing';

const catalog: PublicPricingCatalog = {
  models: [],
  advanced: [
    {
      key: 'mixcut-video',
      displayName: '智能混剪',
      creditCost: 20,
      costUnit: 'per_job',
    },
    {
      key: 'dh-batch-v2-video',
      displayName: '数字人交错混剪',
      creditCost: 20,
      costUnit: 'per_job',
    },
  ],
};

describe('estimateAdvancedCredits', () => {
  it('returns per-item advanced credits multiplied by the requested count', () => {
    expect(estimateAdvancedCredits(catalog, 'mixcut-video', { count: 3 })).toBe(60);
    expect(estimateAdvancedCredits(catalog, 'dh-batch-v2-video', { count: 2 })).toBe(40);
  });

  it('returns null when the advanced pricing key is missing', () => {
    expect(estimateAdvancedCredits(catalog, 'unknown-key', { count: 2 })).toBeNull();
  });
});
