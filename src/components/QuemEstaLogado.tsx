'use client';

import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/store/useAuthStore';

// Nome visível de quem está logado; title leva o e-mail.
export default function QuemEstaLogado() {
  const { user, token } = useAuthStore();

  let claims: { name?: unknown; email?: unknown } = {};
  if (token) {
    try {
      claims = jwtDecode(token);
    } catch {
      claims = {};
    }
  }

  const claimEmail = typeof claims.email === 'string' ? claims.email.trim() : '';
  const claimName = typeof claims.name === 'string' ? claims.name.trim() : '';
  const sessionEmail = user?.email?.trim() ?? '';

  const nome = claimName || claimEmail || sessionEmail;
  if (!nome) return null;

  const email = claimEmail || sessionEmail;

  return (
    <span
      title={email}
      className="text-sm font-semibold text-slate-200 max-w-[12rem] truncate"
    >
      {nome}
    </span>
  );
}
