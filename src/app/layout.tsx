import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import { LevelUpProvider } from "@/components/LevelUpContext";

// Importar estilos globais e Bootstrap local
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
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
                if (window.location.hostname === 'localhost') {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (let registration of registrations) {
                      registration.unregister().then(function(boolean) {
                        if (boolean) console.log('ServiceWorker do localhost removido para evitar cache conflituoso.');
                      });
                    }
                  });
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('PWA ServiceWorker registrado com sucesso:', reg.scope);
                    }).catch(function(err) {
                      console.log('Falha ao registrar PWA ServiceWorker:', err);
                    });
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body>
        <LevelUpProvider>
          <AppShell user={userData}>{children}</AppShell>
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
