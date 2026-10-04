// apps/web/src/api/client.ts
import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

import { tokenStorage } from '@/store/tokens';
import type { ApiErrorResponse, ApiResponse, TokenPair } from '@taskverse/types';

export type { ApiResponse } from '@taskverse/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** Single in-flight refresh so concurrent 401s do not race each other. */
let refreshPromise: Promise<TokenPair> | null = null;

const refreshTokens = async (): Promise<TokenPair> => {
  if (!refreshPromise) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');
    refreshPromise = axios
      .post<ApiResponse<{ tokens: TokenPair }>>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
      .then(res => {
        tokenStorage.set(res.data.data.tokens);
        return res.data.data.tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = AUTH_PATHS.some(p => original?.url?.includes(p));

    // Expired access token: refresh once and replay the request.
    if (original && status === 403 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const { accessToken } = await refreshTokens();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        tokenStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(error);
      }
    }

    if (!error.response) {
      toast.error(error.code === 'ECONNABORTED' ? 'Request timed out.' : 'Network error.');
    } else if (status && status >= 500) {
      toast.error('Something went wrong on the server. Please try again.');
    }

    return Promise.reject(error);
  }
);

/** Extracts the API's human-readable message from an Axios error. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<ApiResponse<T>>(url, config).then(res => res.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<ApiResponse<T>>(url, data, config).then(res => res.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<ApiResponse<T>>(url, data, config).then(res => res.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<ApiResponse<T>>(url, data, config).then(res => res.data),
  delete: <T = undefined>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<ApiResponse<T>>(url, config).then(res => res.data),
};
