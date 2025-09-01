// apps/web/src/api/auth.api.ts
import { useMutation, useQuery } from 'react-query';
import { api, ApiResponse } from './client';
import type { LoginInput, RegisterInput, ChangePasswordInput } from '@taskverse/types';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      taskReminders: boolean;
      taskAssignments: boolean;
    };
    defaultView: 'list' | 'kanban' | 'calendar';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface Session {
  _id: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: string;
}

// API functions
export const authApi = {
  register: (data: RegisterInput): Promise<ApiResponse<AuthResponse>> =>
    api.post('/auth/register', data),

  login: (data: LoginInput): Promise<ApiResponse<AuthResponse>> =>
    api.post('/auth/login', data),

  logout: (refreshToken: string): Promise<ApiResponse> =>
    api.post('/auth/logout', { refreshToken }),

  logoutAll: (): Promise<ApiResponse> =>
    api.post('/auth/logout-all'),

  refreshToken: (refreshToken: string): Promise<ApiResponse<{ tokens: AuthResponse['tokens'] }>> =>
    api.post('/auth/refresh', { refreshToken }),

  getProfile: (): Promise<ApiResponse<{ user: User }>> =>
    api.get('/auth/profile'),

  changePassword: (data: ChangePasswordInput): Promise<ApiResponse> =>
    api.post('/auth/change-password', data),

  getSessions: (): Promise<ApiResponse<{ sessions: Session[] }>> =>
    api.get('/auth/sessions'),

  revokeSession: (sessionId: string): Promise<ApiResponse> =>
    api.delete(`/auth/sessions/${sessionId}`),
};

// React Query hooks
export const useRegister = () => {
  return useMutation(authApi.register, {
    onSuccess: () => {
      // Handle success in component
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
    },
  });
};

export const useLogin = () => {
  return useMutation(authApi.login, {
    onSuccess: () => {
      // Handle success in component
    },
    onError: (error: any) => {
      console.error('Login error:', error);
    },
  });
};

export const useLogout = () => {
  return useMutation(authApi.logout, {
    onSuccess: () => {
      // Handle success in component
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
    },
  });
};

export const useLogoutAll = () => {
  return useMutation(authApi.logoutAll, {
    onSuccess: () => {
      // Handle success in component
    },
  });
};

export const useProfile = () => {
  return useQuery('auth/profile', authApi.getProfile, {
    retry: false,
    enabled: !!localStorage.getItem('accessToken'),
  });
};

export const useChangePassword = () => {
  return useMutation(authApi.changePassword, {
    onSuccess: () => {
      // Handle success in component
    },
  });
};

export const useSessions = () => {
  return useQuery('auth/sessions', authApi.getSessions, {
    enabled: !!localStorage.getItem('accessToken'),
  });
};

export const useRevokeSession = () => {
  return useMutation(authApi.revokeSession, {
    onSuccess: () => {
      // Invalidate sessions query to refetch
    },
  });
};