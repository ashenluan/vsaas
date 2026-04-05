export const ADMIN_ACCESS_TOKEN_KEY = 'adminAccessToken';
export const ADMIN_REFRESH_TOKEN_KEY = 'adminRefreshToken';

function getStorage(): Storage | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

export function storeAdminTokens(accessToken: string, refreshToken: string) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(ADMIN_ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAdminTokens() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  storage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
}

export function getAdminAccessToken(): string | null {
  return getStorage()?.getItem(ADMIN_ACCESS_TOKEN_KEY) ?? null;
}

export function getAdminRefreshToken(): string | null {
  return getStorage()?.getItem(ADMIN_REFRESH_TOKEN_KEY) ?? null;
}
