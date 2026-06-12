'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import { Lock, Mail, AlertCircle, Loader2, FileText } from 'lucide-react';

import { loginSchema, type LoginFormValues } from '@/lib/validations';
import { userPool } from '@/lib/cognito';
import { useAuthStore } from '@/store/useAuthStore';
import { blogApi } from '@/lib/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    const authDetails = new AuthenticationDetails({
      Username: data.email.toLowerCase().trim(),
      Password: data.password,
    });

    const cognitoUser = new CognitoUser({
      Username: data.email.toLowerCase().trim(),
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (result) => {
        try {
          const idToken = result.getIdToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();
          const decoded: any = jwtDecode(idToken);
          const groups = decoded['cognito:groups'] || [];
          
          const user = {
            email: decoded.email,
            groups: groups,
          };

          // Temporarily set auth to allow API call
          setAuth(user, idToken, [], refreshToken);

          let enabledServices: string[] = [];

          // Verify if user has blog access
          if (groups.includes('Admins') || groups.includes('GlobalAdmin')) {
            enabledServices = ['blog'];
          } else {
            try {
              // Call API to check if blog service is contracted
              // If it returns 403, blogApi throws an error
              await blogApi.listPosts(undefined, 1);
              enabledServices = ['blog'];
            } catch (apiErr: any) {
              if (apiErr.message && apiErr.message.includes('403')) {
                enabledServices = [];
              } else {
                // Other error, maybe just let them through and let the app handle it
                enabledServices = ['blog']; 
              }
            }
          }

          setAuth(user, idToken, enabledServices, refreshToken);
          
          if (enabledServices.includes('blog')) {
            router.push('/posts');
          } else {
            router.push('/403');
          }
        } catch (err) {
          console.error(err);
          setError('Ocorreu um erro ao processar seu login.');
          setLoading(false);
        }
      },
      onFailure: (err) => {
        setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
        setLoading(false);
      },
      newPasswordRequired: () => {
        setError('Uma nova senha é necessária. Por favor, utilize o portal principal para atualizar sua senha.');
        setLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-800/80 relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4">
            <FileText className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            Blog <span className="text-emerald-500">Admin</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Gestão de Conteúdo Unum
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 block" htmlFor="email">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                {...register('email')}
                id="email"
                type="email"
                className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                placeholder="seu@email.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 block" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                {...register('password')}
                id="password"
                type="password"
                className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
