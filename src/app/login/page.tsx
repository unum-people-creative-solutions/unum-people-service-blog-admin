'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { loginSchema, type LoginFormValues } from '@/lib/validations';
import { userPool } from '@/lib/cognito';
import { useAuthStore } from '@/store/useAuthStore';
import { blogApi } from '@/lib/api';

export default function LoginPage() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userObj, setUserObj] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace('/posts');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onLoginSuccess = async (result: any) => {
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
          await blogApi.listPosts(undefined, 1);
          enabledServices = ['blog'];
        } catch (apiErr: any) {
          if (apiErr.message && apiErr.message.includes('403')) {
            enabledServices = [];
          } else {
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
  };

  const onSubmit = (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    const normalizedEmail = data.email.toLowerCase().trim();

    const authDetails = new AuthenticationDetails({
      Username: normalizedEmail,
      Password: data.password,
    });

    const cognitoUser = new CognitoUser({
      Username: normalizedEmail,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: onLoginSuccess,
      onFailure: (err) => {
        setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
        setLoading(false);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        setUserObj(cognitoUser);
        setIsChangingPassword(true);
        setLoading(false);
      },
    });
  };

  const handleSetNewPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setError("Você deve aceitar os Termos de Uso e Política de Privacidade para continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    
    userObj.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (result: any) => {
        const email = userObj.getUsername();
        localStorage.setItem(`terms-accepted-${email}`, new Date().toISOString());
        onLoginSuccess(result);
      },
      onFailure: (err: any) => {
        setError(err.message || "Erro ao definir nova senha");
        setLoading(false);
      }
    });
  };

  if (isChangingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative font-sans">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(255,61,0,0.06),transparent_60%)] pointer-events-none" />
        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-800/80 relative z-10">
          <div className="flex justify-center mb-6">
            <Image src="/logo_texto.png" alt="Unum People" width={180} height={48} className="object-contain w-auto h-auto" priority />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white text-center">Bem-vindo(a)!</h1>
          <p className="text-slate-400 text-sm text-center mb-8">Este é seu primeiro acesso. Por favor, defina uma senha definitiva.</p>
          
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-slate-300 block mb-2">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            <div className="flex items-start space-x-3 py-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 accent-accent-500 focus:ring-accent-500 bg-slate-950/50 border-slate-800 rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-slate-400 cursor-pointer leading-tight">
                Eu li e concordo com os <Link href="/terms" target="_blank" className="text-accent-500 font-bold hover:underline">Termos de Uso</Link> e a <Link href="/privacy" target="_blank" className="text-accent-500 font-bold hover:underline">Política de Privacidade</Link>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(255,61,0,0.06),transparent_60%)] pointer-events-none" />
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-800/80 relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-4">
            <Image src="/logo_simbolo.png" alt="Unum People" width={64} height={64} className="object-contain w-auto h-auto" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            Blog <span className="text-accent-500">Admin</span>
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
                className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
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
                className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-slate-100 placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-xs font-semibold text-accent-500 hover:text-accent-400 hover:underline transition-colors">
                Esqueci a senha?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-accent-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
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

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex justify-center space-x-4 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          <Link href="/terms" className="hover:text-accent-500 transition-colors">Termos</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-accent-500 transition-colors">Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
