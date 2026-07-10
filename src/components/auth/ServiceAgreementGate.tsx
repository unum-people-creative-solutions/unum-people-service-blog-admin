'use client';

import { useState } from 'react';
import { serviceAgreementApi, ServiceAgreementStatusResponse } from '@/lib/api';

interface ServiceAgreementGateProps {
  status: ServiceAgreementStatusResponse;
  onAccepted: () => void;
}

export default function ServiceAgreementGate({ status, onAccepted }: ServiceAgreementGateProps) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      await serviceAgreementApi.accept(status.required_version);
      onAccepted();
    } catch (err: any) {
      // Nunca fecha o gate silenciosamente — só uma resposta confirmada libera o acesso.
      setError(err?.message || 'Não foi possível registrar o aceite. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-xl font-bold text-white mb-2">Termo de Contratação de Serviço</h2>
        <p className="text-sm text-slate-400 mb-4">
          Para continuar utilizando o sistema, revise e aceite o Termo de Contratação referente ao pacote
          contratado: <strong className="text-slate-200">{status.term_name}</strong>.
        </p>
        <a
          href={status.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-500 text-sm font-semibold underline"
        >
          Ler o Termo de Contratação completo
        </a>

        <div className="flex items-start gap-2 mt-6">
          <input
            type="checkbox"
            id="accept-service-agreement"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="accept-service-agreement" className="text-sm text-slate-300">
            Li e concordo com o Termo de Contratação de Serviço acima.
          </label>
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm mt-3">{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full mt-6 bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {loading ? 'Processando...' : 'Concordar e Continuar'}
        </button>
      </div>
    </div>
  );
}
