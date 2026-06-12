import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
}

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
  availableTenants: Tenant[];
  activeTenantId: string | null;
  activeTenantName: string | null;
  tenantsLoaded: boolean;
  setAvailableTenants: (tenants: Tenant[]) => void;
  setActiveTenant: (id: string, name: string) => void;
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
      availableTenants: [],
      activeTenantId: null,
      activeTenantName: null,
      tenantsLoaded: false,
      setAvailableTenants: (tenants) => {
        const state = get();
        set({ availableTenants: tenants, tenantsLoaded: true });
        // Auto-seleciona se houver exatamente 1 tenant e nenhum ativo
        if (tenants.length === 1 && !state.activeTenantId) {
          set({ activeTenantId: tenants[0].id, activeTenantName: tenants[0].name });
        }
      },
      setActiveTenant: (id, name) => set({ activeTenantId: id, activeTenantName: name }),
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
        isAdmin: false,
        availableTenants: [],
        activeTenantId: null,
        activeTenantName: null,
        tenantsLoaded: false
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
        activeTenantId: state.activeTenantId,
        activeTenantName: state.activeTenantName,
        availableTenants: state.availableTenants,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

