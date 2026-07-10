'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { serviceAgreementApi, ServiceAgreementStatusResponse } from '@/lib/api';
import { redirectToHostedUI } from '@/lib/pkce';
import ServiceAgreementGate from './ServiceAgreementGate';
import ServiceAgreementWaiting from './ServiceAgreementWaiting';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/403' && pathname !== '/auth/callback';
  const [agreementStatus, setAgreementStatus] = useState<ServiceAgreementStatusResponse | null>(null);

  useEffect(() => {
    if (isProtectedRoute && hasHydrated) {
      if (!isAuthenticated) {
        void redirectToHostedUI(pathname);
      }
    }
  }, [isAuthenticated, pathname, isProtectedRoute, hasHydrated]);

  useEffect(() => {
    if (isProtectedRoute && hasHydrated && isAuthenticated) {
      // Gate independente do fluxo de LGPD (login/troca de senha) — os dois
      // podem coexistir na mesma tela, ver HANDOFF-fase5.md.
      // Fail-closed: erro na busca vira pendente/sem permissão de aceite
      // (tela de espera), nunca libera o acesso.
      serviceAgreementApi.getMyStatus()
        .then(setAgreementStatus)
        .catch(() => setAgreementStatus({
          status: 'pendente',
          term_name: '',
          required_version: 0,
          document_url: '',
          can_accept: false,
        }));
    } else {
      setAgreementStatus(null);
    }
  }, [isProtectedRoute, hasHydrated, isAuthenticated]);

  // SUG-3 (/local-review): quem vê ServiceAgreementWaiting não é quem aceita
  // (é o TenantAdmin, em outra sessão/dispositivo) — sem polling, a tela só
  // desbloqueava com um F5 manual depois do aceite acontecer em outro lugar.
  const isWaitingForAgreement = agreementStatus?.status === 'pendente' && agreementStatus.can_accept === false;
  useEffect(() => {
    if (!isWaitingForAgreement) return;

    const intervalId = setInterval(() => {
      serviceAgreementApi.getMyStatus()
        .then(setAgreementStatus)
        .catch(() => {});
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isWaitingForAgreement]);

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
