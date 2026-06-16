'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { ArrowLeft, Mail, Lock, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordValues, type ResetPasswordValues } from '@/lib/validations';
import { userPool } from '@/lib/cognito';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Code/Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const router = useRouter();

  const forgotForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const getCognitoUser = (userEmail: string) => {
    const normalizedEmail = userEmail.toLowerCase().trim();
    return new CognitoUser({
      Username: normalizedEmail,
      Pool: userPool,
    });
  };

  const handleRequestCode = (data: ForgotPasswordValues) => {
    setLoading(true);
    setError(null);
    setIsFirstAccess(false);
    setEmail(data.email);

    const cognitoUser = getCognitoUser(data.email);

    cognitoUser.forgotPassword({
      onSuccess: () => {
        setStep(2);
        setLoading(false);
      },
      onFailure: (err: any) => {
        if (err.code === 'InvalidParameterException' || err.code === 'NotAuthorizedException') {
          setIsFirstAccess(true);
        } else {
          setError(err.message || 'Erro ao solicitar código de recuperação.');
        }
        setLoading(false);
      }
    });
  };

  const handleResetPassword = (data: ResetPasswordValues) => {
    setLoading(true);
    setError(null);

    const cognitoUser = getCognitoUser(email);

    cognitoUser.confirmPassword(data.code, data.newPassword, {
      onSuccess: () => {
        // Redirecionamento após sucesso
        router.push('/login?reset=success');
      },
      onFailure: (err: any) => {
        setError(err.message || 'Erro ao redefinir a senha.');
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(255,61,0,0.06),transparent_60%)] pointer-events-none" />
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-800/80 relative z-10">
        <Link href="/login" className="flex items-center gap-2 text-slate-400 hover:text-accent-500 text-sm mb-6 transition-colors w-fit font-semibold">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-4">
            <Image src="/logo_simbolo.png" alt="Unum People" width={56} height={56} className="object-contain w-auto h-auto opacity-80" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            Recuperar <span className="text-accent-500">Senha</span>
          </h1>
        </div>

        {step === 1 ? (
          <form onSubmit={forgotForm.handleSubmit(handleRequestCode)} className="space-y-6">
            <p className="text-slate-400 text-sm text-center mb-6">
              Insira o seu e-mail cadastrado para enviarmos um código de verificação.
            </p>

            {isFirstAccess ? (
              <div role="alert" aria-live="polite" className="p-4 bg-amber-950/30 border border-amber-900/50 text-amber-400 text-xs rounded-lg space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Ação necessária no primeiro acesso
                </p>
                <p className="opacity-90">Por favor, utilize a senha temporária enviada por e-mail para realizar o login antes de redefinir sua senha definitiva.</p>
                <Link href="/login" className="block font-bold underline hover:text-amber-300 mt-2 transition-colors">
                  Voltar ao Login
                </Link>
              </div>
            ) : error ? (
              <div role="alert" aria-live="polite" className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 block" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  {...forgotForm.register('email')}
                  id="email"
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                  placeholder="seu@email.com"
                />
              </div>
              {forgotForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{forgotForm.formState.errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Código'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-6">
            {/* Campo oculto para interceptar o autofill do navegador */}
            <input type="text" autoComplete="username" defaultValue={email} className="hidden" aria-hidden="true" />

            <p className="text-slate-400 text-sm text-center mb-6">
              Insira o código enviado para <strong className="text-white font-semibold">{email}</strong> e escolha uma nova senha.
            </p>

            {error && (
              <div role="alert" aria-live="polite" className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 block" htmlFor="code">
                Código de Verificação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  {...resetForm.register('code')}
                  id="code"
                  type="text"
                  autoComplete="one-time-code"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                  placeholder="6 dígitos"
                />
              </div>
              {resetForm.formState.errors.code && <p className="text-xs text-red-500 mt-1">{resetForm.formState.errors.code.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 block" htmlFor="newPassword">
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  {...resetForm.register('newPassword')}
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              {resetForm.formState.errors.newPassword && <p className="text-xs text-red-500 mt-1">{resetForm.formState.errors.newPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
