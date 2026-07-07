'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { serviceAgreementApi, ServiceAgreementStatusResponse } from '@/lib/api';
import ServiceAgreementGate from './ServiceAgreementGate';
import ServiceAgreementWaiting from './ServiceAgreementWaiting';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/login' && pathname !== '/403' && pathname !== '/forgot-password';
  const [agreementStatus, setAgreementStatus] = useState<ServiceAgreementStatusResponse | null>(null);

  useEffect(() => {
    if (isProtectedRoute && hasHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router, isProtectedRoute, hasHydrated]);

  useEffect(() => {
    if (isProtectedRoute && hasHydrated && isAuthenticated) {
      // Gate independente do fluxo de LGPD (login/troca de senha) — os dois
      // podem coexistir na mesma tela, ver HANDOFF-fase5.md.
      serviceAgreementApi.getMyStatus()
        .then(setAgreementStatus)
        .catch(() => setAgreementStatus(null));
    } else {
      setAgreementStatus(null);
    }
  }, [isProtectedRoute, hasHydrated, isAuthenticated]);

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

  return (
    <>
      {children}
      {agreementStatus?.status === 'pendente' && (
        agreementStatus.can_accept ? (
          <ServiceAgreementGate
            status={agreementStatus}
            onAccepted={() => setAgreementStatus((prev) => (prev ? { ...prev, status: 'aceito' } : prev))}
          />
        ) : (
          <ServiceAgreementWaiting />
        )
      )}
    </>
  );
}
