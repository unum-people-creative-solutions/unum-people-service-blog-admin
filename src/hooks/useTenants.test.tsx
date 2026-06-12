import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTenants } from './useTenants';
import { useAuthStore } from '@/store/useAuthStore';
import { blogApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  blogApi: {
    listTenants: vi.fn(),
  },
}));

describe('useTenants hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    useAuthStore.setState({
      isAuthenticated: true,
      availableTenants: [],
      tenantsLoaded: false,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should call listTenants when authenticated and update store with data', async () => {
    const mockTenants = [{ id: 'tenant-1', name: 'Tenant 1' }];
    vi.mocked(blogApi.listTenants).mockResolvedValue(mockTenants);

    const { result } = renderHook(() => useTenants(), { wrapper });

    // Loading initially
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.tenantsLoaded).toBe(true);
    });

    expect(blogApi.listTenants).toHaveBeenCalledWith('blog');
    expect(result.current.tenants).toEqual(mockTenants);
    expect(result.current.isLoading).toBe(false);
  });

  it('should not call listTenants if not authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: false });

    const { result } = renderHook(() => useTenants(), { wrapper });

    expect(result.current.isLoading).toBe(false); // not authenticated means we are not fetching
    expect(blogApi.listTenants).not.toHaveBeenCalled();
  });
});
