import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoAscend from "@/components/LogoAscend";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-vh-100 bg-dark text-white overflow-hidden position-relative">
      {/* Background Glow Overlay */}
      <div
        className="position-absolute"
        style={{
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "800px",
          background: "radial-gradient(circle, rgba(199, 163, 90, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Top Navbar */}
      <header className="border-bottom border-secondary border-opacity-25 position-relative z-3">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <LogoAscend height={48} />
            <span className="ascend-title text-warning fs-4 fw-bold mb-0" style={{ letterSpacing: "2px" }}>
              ASCEND OS
            </span>
          </div>
          <div className="d-flex gap-3 align-items-center">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-ascend px-4 fw-bold">
                Ir para Meu Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ascend-outline px-4">
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn btn-ascend px-4 fw-bold">
                  Cadastrar-se Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-5 position-relative z-2">
        <div className="container py-5 text-center" style={{ maxWidth: "900px" }}>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-4 border border-warning border-opacity-25 bg-dark text-warning small fw-semibold">
            <span className="badge bg-warning text-dark rounded-pill">V 2.0</span>
            O Sistema Operacional Pessoal de Alta Performance
          </div>

          <div className="d-flex justify-content-center mb-3">
            <LogoAscend height={120} />
          </div>

          <h1 className="ascend-title display-3 fw-bold text-white mb-3" style={{ letterSpacing: "1px", lineHeight: "1.1" }}>
            Evolua todos os dias no <span className="gold-text">Ascend OS</span>
          </h1>

          <p className="text-muted fs-5 mb-5 mx-auto" style={{ maxWidth: "700px", lineHeight: "1.6" }}>
            Unifique sua <strong>Saúde</strong>, <strong>Finanças Executivas</strong>, <strong>Foco & Hábitos</strong> e <strong>Jornadas de Metas</strong> em um único ecossistema gamificado impulsionado por Inteligência Artificial.
          </p>

          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link href={isLoggedIn ? "/dashboard" : "/cadastro"} className="btn btn-ascend btn-lg px-5 py-3 fs-6 fw-bold">
              {isLoggedIn ? "Acessar Meu Painel" : "Iniciar Minha Jornada"}
            </Link>
            <Link href="/saude" className="btn btn-ascend-outline btn-lg px-5 py-3 fs-6">
              Explorar Módulo de Saúde
            </Link>
          </div>
        </div>
      </section>

      {/* Grid de Pilares do Sistema */}
      <section className="py-5 position-relative z-2 border-top border-secondary border-opacity-25 bg-black bg-opacity-40">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="ascend-title text-warning fs-2 mb-2">Pilares do Seu Alto Desempenho</h2>
            <p className="text-muted small">Tudo o que você precisa para assumir o controle total do seu estilo de vida</p>
          </div>

          <div className="row g-4">
            {/* Pilar 1: Saúde */}
            <div className="col-lg-4 col-md-6">
              <div className="glass-card p-4 h-100 border border-secondary border-opacity-50 rounded-4">
                <div className="badge bg-success bg-opacity-20 text-success mb-3 px-3 py-1.5 rounded-pill">
                  Performance & Nutrição
                </div>
                <h4 className="ascend-title text-white mb-2">Saúde & Treinos</h4>
                <p className="text-muted small mb-0" style={{ lineHeight: "1.6" }}>
                  Balanço Energético Real em Tempo Real (Déficit/Superávit), Taxa Metabólica Basal (TMB), acompanhamento de cargas de musculação e hidratação.
                </p>
              </div>
            </div>

            {/* Pilar 2: Finanças */}
            <div className="col-lg-4 col-md-6">
              <div className="glass-card p-4 h-100 border border-secondary border-opacity-50 rounded-4">
                <div className="badge bg-warning bg-opacity-20 text-warning mb-3 px-3 py-1.5 rounded-pill">
                  Inteligência Financeira
                </div>
                <h4 className="ascend-title text-white mb-2">Finanças Executivas</h4>
                <p className="text-muted small mb-0" style={{ lineHeight: "1.6" }}>
                  Controle de receitas, despesas, saldo acumulado mensal, categorias inteligentes e diagnósticos financeiros automatizados.
                </p>
              </div>
            </div>

            {/* Pilar 3: Gamificação */}
            <div className="col-lg-4 col-md-6">
              <div className="glass-card p-4 h-100 border border-secondary border-opacity-50 rounded-4">
                <div className="badge bg-info bg-opacity-20 text-info mb-3 px-3 py-1.5 rounded-pill">
                  Evolução Gamificada
                </div>
                <h4 className="ascend-title text-white mb-2">XP & Níveis de Rank</h4>
                <p className="text-muted small mb-0" style={{ lineHeight: "1.6" }}>
                  Ganhe pontos de experiência ao concluir hábitos e treinos. Avance de <strong>Bronze</strong> até o nível <strong>Diamante</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 border-top border-secondary border-opacity-25 text-center text-muted small position-relative z-2">
        <div className="container d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>© 2026 Ascend OS — Sistema Operacional de Evolução Pessoal</span>
          <div className="d-flex gap-3">
            <Link href="/login" className="text-muted text-decoration-none">Login</Link>
            <Link href="/cadastro" className="text-muted text-decoration-none">Cadastro</Link>
            <Link href="/dashboard" className="text-muted text-decoration-none">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
