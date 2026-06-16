'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/login' && pathname !== '/403' && pathname !== '/forgot-password';

  useEffect(() => {
    if (isProtectedRoute && hasHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router, isProtectedRoute, hasHydrated]);

  if (isProtectedRoute && (!hasHydrated || !isAuthenticated)) {
    return (
      <div
        role="status"
        aria-label="Validando sessao"
        className="flex items-center justify-center min-h-screen bg-slate-900"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" aria-hidden="true"></div>
      </div>
    );
  }

  return <>{children}</>;
}
