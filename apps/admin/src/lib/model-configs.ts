import type { PricingCostUnit } from '@vsaas/shared-types';

export function formatModelCreditCost(creditCost: number, costUnit: PricingCostUnit) {
  const unitLabel = costUnit === 'per_second'
    ? '积分/秒'
    : costUnit === 'per_job'
      ? '积分/次'
      : '积分/张';

  return `${creditCost} ${unitLabel}`;
}

export function summarizeModelCapabilities(capabilities: Record<string, unknown> | null | undefined) {
  if (!capabilities || typeof capabilities !== 'object') {
    return '默认';
  }

  const summary = ['resolution', 'outputSize', 'variant', 'group']
    .filter((key) => capabilities[key] !== undefined)
    .map((key) => `${key}=${String(capabilities[key])}`);

  return summary.length > 0 ? summary.join(' · ') : '默认';
}
