"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function ServiceAgreementWaiting() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleBackToLogin = () => {
    logout();
    router.push("/login");
  };

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
