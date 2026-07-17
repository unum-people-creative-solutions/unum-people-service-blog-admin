'use client';

import { useEffect, useState } from 'react';
import { termsApi, PendingTermItem } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { logoutFromHostedUI } from '@/lib/pkce';

export default function PendingTermsGate() {
  const [pendingItems, setPendingItems] = useState<PendingTermItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const { logout, tenantsLoaded } = useAuthStore();

  const fetchStatus = () => {
    termsApi.getStatus()
      .then((res) => {
        setPendingItems(res.pending);
        setIsError(false);
      })
      .catch(() => {
        setIsError(true);
        // Fail-closed: erro na chamada trata como pendente não-acionável
        setPendingItems([
          {
            type: 'error',
            term_id: 'error',
            term_name: 'Erro',
            required_version: 0,
            can_accept: false,
            document_url: '',
          },
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // Aguarda o tenant ativo resolver (mesmo sinal que ServiceGuard usa via
    // useTenants()) antes de consultar /me/terms/status — senão a chamada sai
    // sem X-Tenant-ID e o backend cai no default do claim do JWT, que pode não
    // ser o tenant onde o usuário é de fato TenantAdmin.
    if (!tenantsLoaded) return;
    fetchStatus();
  }, [tenantsLoaded]);

  const hasPending = pendingItems !== null && pendingItems.length > 0;
  const canAcceptAny = pendingItems !== null && pendingItems.some((item) => item.can_accept === true);

  // Polling a cada 15s quando temos pendências mas nenhuma acionável (can_accept=false)
  const isWaiting = hasPending && !canAcceptAny;
  useEffect(() => {
    if (!isWaiting) return;

    const intervalId = setInterval(() => {
      fetchStatus();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isWaiting]);

  if (loading) {
    return null;
  }

  if (!hasPending) {
    return null;
  }

  const handleGoToCustomers = () => {
    const customersUrl = process.env.NEXT_PUBLIC_CUSTOMERS_URL || 'https://customer.unumpeople.com.br';
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `${customersUrl}?return_to=${returnTo}`;
  };

  const handleBackToLogin = () => {
    logout();
    logoutFromHostedUI();
  };

  if (canAcceptAny) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Você tem termos pendentes</h2>
          <p className="text-sm text-slate-400 mb-6">
            Para continuar acessando o sistema, revise e aceite os novos termos legais no Portal do Cliente.
          </p>
          <button
            onClick={handleGoToCustomers}
            className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all"
          >
            Ir para o Portal do Cliente
          </button>
        </div>
      </div>
    );
  }

  // Se tem pendentes mas nenhum can_accept=true (todos false)
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Aguardando aceite do Termo de Contratação</h2>
        <p className="text-sm text-slate-400">
          O administrador da sua conta ainda não aceitou o Termo de Contratação de Serviço. Assim que isso
          acontecer, você poderá continuar normalmente.
        </p>
        <button
          onClick={handleBackToLogin}
          className="mt-6 text-sm font-semibold text-accent-500 underline hover:text-accent-400"
        >
          Sair e voltar para o login
        </button>
      </div>
    </div>
  );
}
