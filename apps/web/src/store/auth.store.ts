// apps/web/src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type User, type AuthResponse } from '@/api/auth.api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await authApi.login({ email, password });
          
          if (response.success && response.data) {
            const { user, tokens } = response.data;
            
            // Store tokens
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            
            // Update state
            set({ user, isLoading: false });
            
            toast.success(`Welcome back, ${user.username}!`);
            return true;
          }
          
          throw new Error(response.message || 'Login failed');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.message || error.message || 'Login failed');
          return false;
        }
      },

      register: async (data: any) => {
        try {
          set({ isLoading: true });
          
          const response = await authApi.register(data);
          
          if (response.success && response.data) {
            const { user, tokens } = response.data;
            
            // Store tokens
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            
            // Update state
            set({ user, isLoading: false });
            
            toast.success(`Welcome to TaskVerse, ${user.username}!`);
            return true;
          }
          
          throw new Error(response.message || 'Registration failed');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.message || error.message || 'Registration failed');
          return false;
        }
      },

      logout: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
          toast.success('Logged out successfully');
        }
      },

      logoutAll: async () => {
        try {
          await authApi.logoutAll();
          toast.success('Logged out from all devices');
        } catch (error) {
          console.error('Logout all error:', error);
          toast.error('Failed to logout from all devices');
        } finally {
          get().clearAuth();
        }
      },

      initializeAuth: async () => {
        try {
          set({ isLoading: true });
          
          const accessToken = localStorage.getItem('accessToken');
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (!accessToken || !refreshToken) {
            set({ isLoading: false, isInitialized: true });
            return;
          }
          
          // Try to get user profile
          const response = await authApi.getProfile();
          
          if (response.success && response.data) {
            set({ 
              user: response.data.user, 
              isLoading: false, 
              isInitialized: true 
            });
          } else {
            get().clearAuth();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          get().clearAuth();
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ 
          user: null, 
          isLoading: false, 
          isInitialized: true 
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isInitialized: state.isInitialized,
      }),
    }
  )
);