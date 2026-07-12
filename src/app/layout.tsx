import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { LevelUpProvider } from "@/components/LevelUpContext";

// Importar estilos globais
import "../styles/style.css";
import "../styles/sidebar.css";

export const metadata: Metadata = {
  title: "Ascend - Evolução Pessoal",
  description: "Seu sistema pessoal de conquistas, metas, saúde e finanças.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Obter o usuário ID=1 padrão
  const user = await prisma.users.findUnique({
    where: { id: 1 },
  });

  const userData = user
    ? {
        nome: user.nome,
        nivel: user.nivel ?? 1,
        xp_total: user.xp_total ?? 0,
        avatar: user.avatar,
      }
    : {
        nome: "Marcelo Gomes",
        nivel: 1,
        xp_total: 0,
        avatar: null,
      };

  return (
    <html lang="pt-BR">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#07110c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ascend" />
        <link rel="apple-touch-icon" href="/images/logo-ascend.svg" />

        {/* Bootstrap CSS e Icons */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
        />
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Scripts auxiliares de áudio e sfx se necessário */}
        <script src="/scripts/sfx.js" defer />

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('PWA ServiceWorker registrado com sucesso:', reg.scope);
                  }).catch(function(err) {
                    console.log('Falha ao registrar PWA ServiceWorker:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <LevelUpProvider>
          <div className="ascend-app-shell">
            <Sidebar user={userData} />

            <main className="ascend-app-main">{children}</main>

            <MobileBottomNav />
          </div>
        </LevelUpProvider>

        {/* Bootstrap Bundle JS */}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}
