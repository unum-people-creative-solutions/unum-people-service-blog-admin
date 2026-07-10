'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { blogApi } from '@/lib/api';
import {
  exchangeCodeForTokens,
  redirectToHostedUI,
  PKCE_VERIFIER_STORAGE_KEY,
  AUTH_RETURN_TO_STORAGE_KEY,
} from '@/lib/pkce';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Concluindo login...');
  const hasExecuted = useRef(false);

  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const code = searchParams.get('code');
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    const returnTo = sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY);
    // Uso único: o verifier nunca deve ser reaproveitado numa segunda tentativa.
    sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY);

    if (!code || !codeVerifier) {
      setStatus('error');
      setMessage('Sessão de login inválida ou expirada. Tente novamente.');
      return;
    }

    const run = async () => {
      const tokens = await exchangeCodeForTokens({
        domain: process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN as string,
        clientId: process.env.NEXT_PUBLIC_COGNITO_BLOG_CLIENT_ID as string,
        redirectUri: `${window.location.origin}/auth/callback`,
        code,
        codeVerifier,
      });

      const decoded: any = jwtDecode(tokens.id_token);
      const groups = decoded['cognito:groups'] || [];
      const user = { email: decoded.email, groups };

      // Sessão temporária para permitir a chamada de sondagem abaixo (mesma
      // sequência do login SRP antigo: precisa de um token válido para
      // perguntar à API se o tenant tem o serviço de blog contratado).
      setAuth(user, tokens.id_token, [], tokens.refresh_token);

      let enabledServices: string[] = [];
      if (groups.includes('Admins') || groups.includes('GlobalAdmin') || groups.includes('TenantAdmin')) {
        enabledServices = ['blog'];
      } else {
        try {
          await blogApi.listPosts(undefined, 1);
          enabledServices = ['blog'];
        } catch (apiErr: any) {
          enabledServices = apiErr.message && apiErr.message.includes('403') ? [] : ['blog'];
        }
      }

      setAuth(user, tokens.id_token, enabledServices, tokens.refresh_token);

      if (!enabledServices.includes('blog')) {
        router.push('/403');
        return;
      }

      const safeReturnTo = returnTo && !['/', '/auth/callback'].includes(returnTo) ? returnTo : '/posts';
      router.push(safeReturnTo);
    };

    run().catch((err) => {
      console.error('Erro no callback de autenticação:', err);
      useAuthStore.getState().logout();
      setStatus('error');
      setMessage('Não foi possível concluir o login. Tente novamente.');
    });
  }, [searchParams, router, setAuth]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-800/80 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="text-red-400 w-12 h-12" />
            <h1 className="text-xl font-bold text-white">{message}</h1>
            <button
              onClick={() => redirectToHostedUI('/posts')}
              className="mt-4 bg-accent-600 hover:bg-accent-500 text-white px-6 py-2.5 rounded-lg font-bold transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-accent-500 w-12 h-12" />
        <h1 className="text-xl font-bold text-white">{message}</h1>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
          Carregando...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
