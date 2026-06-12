"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-primary-600 hover:text-primary-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: 29 de Abril de 2026</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introdução</h2>
            <p className="leading-relaxed">
              Esta Política de Privacidade descreve como a Unum People Creative Solutions (&quot;nós&quot;, &quot;plataforma&quot;) coleta, utiliza e protege os dados pessoais no âmbito do nosso serviço de Blog Admin.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Papéis e Responsabilidades</h2>
            <p className="leading-relaxed">
              Para os fins da LGPD, a Unum People Creative Solutions atua como <strong>Operadora</strong> de dados em relação aos leads inseridos por nossos clientes no sistema. Nossos clientes atuam como <strong>Controladores</strong> e são responsáveis por obter o consentimento ou base legal adequada para a coleta de dados de seus próprios leads.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Dados Coletados</h2>
            <p className="leading-relaxed">
              Coletamos dados necessários para a prestação do serviço, tais como:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Dados de conta: Nome, e-mail e cargo dos usuários da plataforma.</li>
              <li>Dados de Leads: Informações inseridas pelos clientes (nome, telefone, e-mail, origem).</li>
              <li>Dados Técnicos: Endereço IP, tipo de navegador e dados de uso via cookies para melhoria do serviço.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Uso dos Dados</h2>
            <p className="leading-relaxed">
              Os dados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Fornecer e gerenciar as funcionalidades do Blog Admin.</li>
              <li>Autenticação e segurança da conta.</li>
              <li>Suporte técnico e comunicações operacionais.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Segurança</h2>
            <p className="leading-relaxed">
              Implementamos medidas técnicas e organizacionais adequadas, como criptografia e controle de acesso rigoroso, para proteger os dados contra acesso não autorizado ou perda.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Seus Direitos</h2>
            <p className="leading-relaxed">
              Nos termos da LGPD, você tem direito a confirmar a existência de tratamento, acessar seus dados, corrigir dados incompletos ou inexatos e solicitar a exclusão de seus dados pessoais sob certas condições.
            </p>
          </div>
        </section>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          &copy; 2026 Unum People Creative Solutions. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
