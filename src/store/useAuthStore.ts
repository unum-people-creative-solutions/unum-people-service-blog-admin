import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  groups: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  enabledServices: string[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, token: string, enabledServices: string[], refreshToken?: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  hasBlogService: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      enabledServices: [],
      isAuthenticated: false,
      isAdmin: false,
      hasHydrated: false,
      setAuth: (user, token, enabledServices, refreshToken) => set({
        user,
        token,
        enabledServices,
        refreshToken: refreshToken || null,
        isAuthenticated: true,
        isAdmin: user.groups.includes('Admins') || user.groups.includes('GlobalAdmin')
      }),
      setToken: (token) => set({ token }),
      logout: () => set({
        user: null,
        token: null,
        refreshToken: null,
        enabledServices: [],
        isAuthenticated: false,
        isAdmin: false
      }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      hasBlogService: () => {
        const state = get();
        // Admins globais têm bypass
        if (state.isAdmin) return true;
        return state.enabledServices.includes('blog');
      }
    }),
    {
      name: 'blog-admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        enabledServices: state.enabledServices,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
