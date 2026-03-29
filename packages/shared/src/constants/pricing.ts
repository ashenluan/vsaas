export interface CreditPricing {
  modelId: string;
  creditCost: number;
  costUnit: 'per_image' | 'per_second' | 'per_job';
}

export const DEFAULT_PRICING: CreditPricing[] = [
  // Image models
  { modelId: 'grok-aurora', creditCost: 2, costUnit: 'per_image' },
  { modelId: 'jimeng-5.0', creditCost: 1.5, costUnit: 'per_image' },
  { modelId: 'jimeng-4.6', creditCost: 1, costUnit: 'per_image' },
  { modelId: 'qwen-wanxiang', creditCost: 1, costUnit: 'per_image' },
  // Video models
  { modelId: 'grok-aurora-video', creditCost: 5, costUnit: 'per_second' },
  { modelId: 'sora-2', creditCost: 8, costUnit: 'per_second' },
  { modelId: 'sora-2-pro', creditCost: 15, costUnit: 'per_second' },
  { modelId: 'seedance-2.0', creditCost: 5, costUnit: 'per_second' },
  { modelId: 'veo-3.1', creditCost: 10, costUnit: 'per_second' },
  // Digital human
  { modelId: 'wan2.2-s2v', creditCost: 0.5, costUnit: 'per_second' },
  // Voice cloning
  { modelId: 'qwen-voice-enrollment', creditCost: 5, costUnit: 'per_job' },
  // Batch compositing
  { modelId: 'aliyun-ims-compose', creditCost: 3, costUnit: 'per_job' },
];

export const DEFAULT_CREDIT_PACKAGES = [
  { name: '体验包', credits: 50, price: 9.9, currency: 'CNY' },
  { name: '基础包', credits: 200, price: 29.9, currency: 'CNY' },
  { name: '专业包', credits: 1000, price: 99.9, currency: 'CNY' },
  { name: '企业包', credits: 5000, price: 399.9, currency: 'CNY' },
];

export function calculateCreditCost(
  modelId: string,
  quantity: number,
  pricing: CreditPricing[] = DEFAULT_PRICING,
): number {
  const model = pricing.find((p) => p.modelId === modelId);
  if (!model) return 0;
  return model.creditCost * quantity;
}
