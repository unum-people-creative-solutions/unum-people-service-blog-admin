'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenants } from '@/hooks/useTenants';

export default function ServiceGuard({ children }: { children: React.ReactNode }) {
  const { hasBlogService, hasHydrated, isAuthenticated } = useAuthStore();
  const { tenants, tenantsLoaded } = useTenants();
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/403' && pathname !== '/auth/callback';

  useEffect(() => {
    if (isProtectedRoute && hasHydrated && isAuthenticated) {
      if (tenantsLoaded && tenants.length === 0) {
        router.push('/403');
      } else if (!hasBlogService()) {
        router.push('/403');
      }
    }
  }, [hasBlogService, isAuthenticated, router, isProtectedRoute, hasHydrated, tenantsLoaded, tenants]);

  const showLoading = isProtectedRoute && isAuthenticated && (
    !hasHydrated ||
    !tenantsLoaded ||
    !hasBlogService() ||
    tenants.length === 0
  );

  if (showLoading) {
    return (
      <div
        role="status"
        aria-label="Verificando servicos contratados"
        className="flex items-center justify-center min-h-screen bg-slate-900"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" aria-hidden="true"></div>
      </div>
    );
  }

  return <>{children}</>;
}

