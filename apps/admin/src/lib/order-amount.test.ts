import { describe, expect, it } from 'vitest';
import { formatOrderAmount } from './order-amount';

describe('formatOrderAmount', () => {
  it('formats Decimal strings as yuan values', () => {
    expect(formatOrderAmount('99')).toBe('99.00');
    expect(formatOrderAmount('19.9')).toBe('19.90');
  });

  it('formats numeric yuan values without dividing by 100', () => {
    expect(formatOrderAmount(128)).toBe('128.00');
    expect(formatOrderAmount(45.6)).toBe('45.60');
  });

  it('returns a placeholder for invalid values', () => {
    expect(formatOrderAmount(undefined)).toBe('--');
    expect(formatOrderAmount('invalid')).toBe('--');
  });
});
