'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { blogApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function useTenants() {
  const { isAuthenticated, setAvailableTenants, availableTenants, tenantsLoaded } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', 'blog'],
    queryFn: () => blogApi.listTenants('blog'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  useEffect(() => {
    if (data) {
      setAvailableTenants(data);
    }
  }, [data, setAvailableTenants]);

  return {
    tenants: availableTenants,
    isLoading: isLoading && !tenantsLoaded,
    tenantsLoaded,
  };
}
