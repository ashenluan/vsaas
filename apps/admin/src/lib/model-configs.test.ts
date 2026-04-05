import { describe, expect, it } from 'vitest';
import { formatModelCreditCost, summarizeModelCapabilities } from './model-configs';

describe('model-config helpers', () => {
  it('formats model credit cost with the correct billing unit', () => {
    expect(formatModelCreditCost(5, 'per_image')).toBe('5 积分/张');
    expect(formatModelCreditCost(20, 'per_second')).toBe('20 积分/秒');
    expect(formatModelCreditCost(50, 'per_job')).toBe('50 积分/次');
  });

  it('summarizes known capability flags for the admin table', () => {
    expect(summarizeModelCapabilities({ resolution: '2k', group: 'qwen-image' })).toBe('resolution=2k · group=qwen-image');
    expect(summarizeModelCapabilities(null)).toBe('默认');
  });
});
