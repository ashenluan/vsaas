export function formatOrderAmount(amount: unknown): string {
  const normalized =
    typeof amount === 'number' || typeof amount === 'string'
      ? amount
      : amount && typeof amount === 'object' && 'toString' in amount
        ? amount.toString()
        : NaN;

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(2);
}
