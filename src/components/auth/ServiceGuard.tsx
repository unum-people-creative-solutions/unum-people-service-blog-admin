'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function ServiceGuard({ children }: { children: React.ReactNode }) {
  const { hasBlogService, hasHydrated, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/login' && pathname !== '/403';

  useEffect(() => {
    if (isProtectedRoute && hasHydrated && isAuthenticated) {
      if (!hasBlogService()) {
        router.push('/403');
      }
    }
  }, [hasBlogService, isAuthenticated, router, isProtectedRoute, hasHydrated]);

  if (isProtectedRoute && isAuthenticated && (!hasHydrated || !hasBlogService())) {
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
