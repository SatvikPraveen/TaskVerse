// apps/web/src/store/auth.store.ts
import toast from 'react-hot-toast';
import { create } from 'zustand';
import type { LoginInput, RegisterInput, User } from '@taskverse/types';

import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';

import { tokenStorage } from './tokens';

interface AuthState {
  user: User | null;
  /** True until the persisted session has been validated against the API. */
  isInitializing: boolean;
  isSubmitting: boolean;
  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isInitializing: true,
  isSubmitting: false,

  login: async input => {
    set({ isSubmitting: true });
    try {
      const { data } = await authApi.login(input);
      tokenStorage.set(data.tokens);
      set({ user: data.user });
      toast.success(`Welcome back, ${data.user.firstName || data.user.username}!`);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  register: async input => {
    set({ isSubmitting: true });
    try {
      const { data } = await authApi.register(input);
      tokenStorage.set(data.tokens);
      set({ user: data.user });
      toast.success(`Welcome to TaskVerse, ${data.user.firstName || data.user.username}!`);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Registration failed'));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // The server-side token may already be gone; local logout still proceeds.
    } finally {
      get().clearAuth();
      toast.success('Logged out');
    }
  },

  logoutAll: async () => {
    try {
      await authApi.logoutAll();
      toast.success('Logged out from all devices');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to log out everywhere'));
    } finally {
      get().clearAuth();
    }
  },

  initialize: async () => {
    if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
      set({ user: null, isInitializing: false });
      return;
    }
    try {
      const { data } = await authApi.getProfile();
      set({ user: data.user, isInitializing: false });
    } catch {
      tokenStorage.clear();
      set({ user: null, isInitializing: false });
    }
  },

  setUser: user => set({ user }),

  updateUser: patch => {
    const current = get().user;
    if (current) set({ user: { ...current, ...patch } });
  },

  clearAuth: () => {
    tokenStorage.clear();
    set({ user: null, isInitializing: false, isSubmitting: false });
  },
}));

// The API client fires this when a refresh fails; drop the session everywhere.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => useAuthStore.getState().clearAuth());
}
