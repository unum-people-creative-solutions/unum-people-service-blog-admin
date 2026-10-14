import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth/AuthGuard";
import ServiceGuard from "@/components/auth/ServiceGuard";
import Providers from "@/components/Providers";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Unum People Blog Admin",
  description: "Gestão de Posts e Conteúdo para Clientes",
  // Painel só para clientes logados: nada aqui deve ir para o Google. Quem não
  // está logado é mandado para o login do Cognito (auth.unumpeople.com.br), e era
  // por esse caminho que o Google indexava a página vazia de login.
  robots: { index: false, follow: false },
};

import CookieBanner from "@/components/CookieBanner";

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} antialiased bg-slate-950 text-slate-100`}>
        <Providers>
          <AuthGuard>
            <ServiceGuard>
              {children}
              {modal}
            </ServiceGuard>
          </AuthGuard>
        </Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
