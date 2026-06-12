'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function ForbiddenPage() {
  const { logout } = useAuthStore();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-6 relative z-10">
        <div className="p-4 bg-accent-500/10 rounded-full border border-accent-500/20 text-accent-400 animate-pulse">
          <ShieldAlert className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Acesso Negado
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Seu tenant não possui o serviço de <span className="text-accent-400 font-medium">Blog</span> contratado em sua conta.
          </p>
        </div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

        <p className="text-slate-500 text-xs">
          Se você acredita que isso é um erro, por favor entre em contato com o suporte da Unum People para habilitar a gestão de posts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-xl transition text-sm font-medium text-slate-200"
          >
            Fazer outro login
          </button>
          
          <Link
            href="/"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent-600 to-teal-600 hover:from-accent-500 hover:to-teal-500 active:opacity-90 rounded-xl transition text-sm font-medium text-white shadow-lg shadow-accent-950/20 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
