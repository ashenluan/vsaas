export function parseMixcutPoolText(value?: string | null) {
  if (!value) return [];

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getPrimaryMixcutPoolItem(value?: string | null) {
  return parseMixcutPoolText(value)[0] || '';
}

export function stringifyMixcutPool(items?: string[] | null) {
  if (!items?.length) return '';

  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');
}
