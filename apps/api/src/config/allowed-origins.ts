function normalizeOrigin(origin: string) {
  return origin.trim();
}

export function buildAllowedOrigins(appUrl: string, adminUrl: string, explicit?: string): string[] {
  const defaultOrigins = [
    appUrl,
    appUrl.replace('localhost', '127.0.0.1'),
    adminUrl,
    adminUrl.replace('localhost', '127.0.0.1'),
  ].map(normalizeOrigin).filter(Boolean);

  const explicitOrigins = explicit
    ? explicit.split(',').map(normalizeOrigin).filter(Boolean)
    : [];

  return [...new Set([...defaultOrigins, ...explicitOrigins])];
}
