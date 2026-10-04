// apps/web/src/store/tokens.ts
import type { TokenPair } from '@taskverse/types';

const ACCESS_KEY = 'taskverse.accessToken';
const REFRESH_KEY = 'taskverse.refreshToken';

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode / quota); the session is memory-only.
  }
};

export const tokenStorage = {
  getAccessToken: () => safeGet(ACCESS_KEY),
  getRefreshToken: () => safeGet(REFRESH_KEY),
  set: ({ accessToken, refreshToken }: TokenPair) => {
    safeSet(ACCESS_KEY, accessToken);
    safeSet(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
  },
};
