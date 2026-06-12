"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUsePage() {
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
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Termos de Uso</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: 29 de Abril de 2026</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p className="leading-relaxed">
              Ao acessar e utilizar o Blog Admin da Unum People Creative Solutions, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar, não utilize o serviço.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p className="leading-relaxed">
              Oferecemos uma plataforma de Blog Admin SaaS para gestão de leads, vendas e atribuição de anúncios. O serviço é oferecido mediante pagamento de assinatura e destinado a uso profissional.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Responsabilidades do Usuário</h2>
            <p className="leading-relaxed">
              O usuário é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. É proibido usar o serviço para qualquer atividade ilegal ou para o envio de spam.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Proteção de Dados (DPA)</h2>
            <p className="leading-relaxed">
              O Cliente (Contratante) declara que possui base legal para processar os dados de terceiros inseridos na plataforma. A Unum People processará tais dados apenas seguindo as instruções do Cliente e para a finalidade da prestação do serviço contratado.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Propriedade Intelectual</h2>
            <p className="leading-relaxed">
              Todos os direitos de propriedade intelectual relacionados à plataforma, incluindo software, design e marcas, pertencem exclusivamente à Unum People Creative Solutions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitação de Responsabilidade</h2>
            <p className="leading-relaxed">
              Na extensão máxima permitida por lei, a Unum People não será responsável por quaisquer danos indiretos, incidentais ou lucros cessantes decorrentes do uso do serviço.
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
