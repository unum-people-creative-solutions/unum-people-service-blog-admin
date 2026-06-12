import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore - Tenant Context', () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({
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
    });
  });

  it('should initialize with default tenant state values', () => {
    const state = useAuthStore.getState();
    expect(state.availableTenants).toEqual([]);
    expect(state.activeTenantId).toBeNull();
    expect(state.activeTenantName).toBeNull();
    expect(state.tenantsLoaded).toBe(false);
  });

  it('should auto-select tenant if exactly one tenant is loaded and none is active', () => {
    const singleTenant = { id: 'tenant-1', name: 'Tenant One' };
    const state = useAuthStore.getState();
    
    state.setAvailableTenants([singleTenant]);

    const updatedState = useAuthStore.getState();
    expect(updatedState.availableTenants).toEqual([singleTenant]);
    expect(updatedState.tenantsLoaded).toBe(true);
    expect(updatedState.activeTenantId).toBe('tenant-1');
    expect(updatedState.activeTenantName).toBe('Tenant One');
  });

  it('should NOT auto-select tenant if multiple tenants are loaded', () => {
    const tenants = [
      { id: 'tenant-1', name: 'Tenant One' },
      { id: 'tenant-2', name: 'Tenant Two' },
    ];
    const state = useAuthStore.getState();
    
    state.setAvailableTenants(tenants);

    const updatedState = useAuthStore.getState();
    expect(updatedState.availableTenants).toEqual(tenants);
    expect(updatedState.tenantsLoaded).toBe(true);
    expect(updatedState.activeTenantId).toBeNull();
    expect(updatedState.activeTenantName).toBeNull();
  });

  it('should set active tenant manually', () => {
    const state = useAuthStore.getState();
    
    state.setActiveTenant('tenant-2', 'Tenant Two');

    const updatedState = useAuthStore.getState();
    expect(updatedState.activeTenantId).toBe('tenant-2');
    expect(updatedState.activeTenantName).toBe('Tenant Two');
  });
});

