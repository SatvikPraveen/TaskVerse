// apps/web/src/api/auth.api.ts
import { useMutation, useQuery, useQueryClient } from 'react-query';

import type {
  AuthResponse,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  Session,
  TokenPair,
  User,
} from '@taskverse/types';

import { api } from './client';

export type { User, Session, AuthResponse } from '@taskverse/types';

export const authApi = {
  register: (data: RegisterInput) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
  refreshToken: (refreshToken: string) => api.post<{ tokens: TokenPair }>('/auth/refresh', { refreshToken }),
  getProfile: () => api.get<{ user: User }>('/users/profile'),
  changePassword: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
  getSessions: () => api.get<{ sessions: Session[] }>('/auth/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
};

export const authKeys = {
  profile: ['auth', 'profile'] as const,
  sessions: ['auth', 'sessions'] as const,
};

export const useProfile = (enabled: boolean) =>
  useQuery(authKeys.profile, authApi.getProfile, { retry: false, enabled });

export const useSessions = () => useQuery(authKeys.sessions, authApi.getSessions);

export const useChangePassword = () => useMutation(authApi.changePassword);

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation(authApi.revokeSession, {
    onSuccess: () => queryClient.invalidateQueries(authKeys.sessions),
  });
};
