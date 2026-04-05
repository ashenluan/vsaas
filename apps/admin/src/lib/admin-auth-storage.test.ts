import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_REFRESH_TOKEN_KEY,
  clearAdminTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
  storeAdminTokens,
} from './admin-auth-storage';

function createStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('admin auth storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('stores admin access and refresh tokens on login', () => {
    storeAdminTokens('access-token', 'refresh-token');

    expect(localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)).toBe('access-token');
    expect(localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY)).toBe('refresh-token');
    expect(getAdminAccessToken()).toBe('access-token');
    expect(getAdminRefreshToken()).toBe('refresh-token');
  });

  it('clears both tokens during unauthorized cleanup', () => {
    storeAdminTokens('access-token', 'refresh-token');

    clearAdminTokens();

    expect(localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('clears both tokens on logout', () => {
    storeAdminTokens('access-token', 'refresh-token');

    clearAdminTokens();

    expect(getAdminAccessToken()).toBeNull();
    expect(getAdminRefreshToken()).toBeNull();
  });
});
