import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  calcularTituloAscend,
  calcularAvatarFrame,
  obterProgressaoTitulos,
  obterDominiosAscensao,
} from "@/lib/utils";
import "@/styles/hall_ascensao.css";

export const revalidate = 0; // Garantir dados em tempo real

export default async function HallPage() {
  // 1. Obter Usuário Padrão ID=1
  const usuario = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!usuario) {
    return notFound();
  }

  // 2. Estatísticas Gerais
  const metas = await prisma.goals.findMany({
    where: { user_id: usuario.id },
  });

  const conquistasTotal = await prisma.achievements.count({
    where: { user_id: usuario.id },
  });

  const eventosTotal = await prisma.user_events.count({
    where: { user_id: usuario.id },
  });

  const sumResult = await prisma.user_events.aggregate({
    where: { user_id: usuario.id },
    _sum: { xp: true },
  });
  const eventosXp = sumResult._sum.xp ?? 0;

  // 3. Cálculos Dinâmicos
  const xpTotal = usuario.xp_total ?? 0;
  const rankAtual = calcularTituloAscend(xpTotal);
  const avatarFrame = calcularAvatarFrame(xpTotal);
  const progressao = obterProgressaoTitulos(xpTotal);
  const dominiosAscensao = obterDominiosAscensao(metas);

  return (
    <main className="hall-page py-4 px-lg-5 text-white">
      <div className="hall-shell container-fluid">
        {/* Hall Topbar */}
        <div className="hall-topbar d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <Link href="/dashboard" className="hall-back text-decoration-none">
            <i className="bi bi-arrow-left me-1"></i> Voltar ao Dashboard
          </Link>

          <div className="hall-mini-actions d-flex gap-3">
            <Link href="/ascensao" className="hall-action text-decoration-none">
              <i className="bi bi-graph-up-arrow me-1"></i> Ascensão
            </Link>
            <Link href="/conquistas" className="hall-action text-decoration-none">
              <i className="bi bi-trophy me-1"></i> Conquistas
            </Link>
            <Link href="/perfil" className="hall-action text-decoration-none">
              <i className="bi bi-person me-1"></i> Perfil
            </Link>
          </div>
        </div>

        {/* Hall Hero */}
        <section className="hall-hero mb-5 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="hall-hero-content d-flex justify-content-between align-items-center flex-wrap gap-4">
            <div className="flex-grow-1" style={{ maxWidth: "680px" }}>
              <div className="hall-eyebrow mb-2 gold-text">
                <i className="bi bi-gem me-1"></i> Hall da Ascensão
              </div>
              <h1 className="hall-title mb-3" style={{ fontSize: "2.5rem", fontFamily: "'Cormorant Garamond', serif" }}>
                Sua evolução <span className="gold-text">em forma de legado.</span>
              </h1>
              <p className="hall-subtitle text-muted">
                O Hall da Ascensão consolida sua trajetória dentro do Ascend: títulos desbloqueados, experiência acumulada, conquistas obtidas e o próximo nível da sua construção pessoal.
              </p>
            </div>

            <aside className="hall-rank-card text-center p-4 rounded" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(226, 201, 133, 0.1)", minWidth: "260px" }}>
              <div className={`hall-avatar mx-auto mb-3 ${avatarFrame}`} style={{ width: "120px", height: "120px" }}>
                {usuario.avatar ? (
                  <img
                    src={`/uploads/${usuario.avatar}`}
                    alt={usuario.nome}
                    className="w-100 h-100 rounded-circle object-fit-cover"
                  />
                ) : (
                  <div className="w-100 h-100 rounded-circle d-flex align-items-center justify-content-center bg-dark">
                    <i className="bi bi-person-fill fs-1 text-muted"></i>
                  </div>
                )}
              </div>

              <h2 className="hall-user-name mb-1" style={{ fontSize: "1.3rem" }}>{usuario.nome}</h2>
              <div className="hall-rank-name mb-2" style={{ color: "var(--gold-soft)", fontWeight: 600 }}>{rankAtual}</div>
              <div className="hall-xp text-muted small">
                {xpTotal} XP acumulados &middot; Nível {usuario.nivel}
              </div>
            </aside>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="hall-grid mb-5">
          <article className="hall-stat">
            <div className="hall-stat-icon"><i className="bi bi-stars"></i></div>
            <h2 className="hall-stat-value">{xpTotal}</h2>
            <p className="hall-stat-label">XP total acumulado</p>
          </article>
          <article className="hall-stat">
            <div className="hall-stat-icon"><i className="bi bi-trophy-fill"></i></div>
            <h2 className="hall-stat-value">{conquistasTotal}</h2>
            <p className="hall-stat-label">Conquistas desbloqueadas</p>
          </article>
          <article className="hall-stat">
            <div className="hall-stat-icon"><i className="bi bi-clock-history"></i></div>
            <h2 className="hall-stat-value">{eventosTotal}</h2>
            <p className="hall-stat-label">Eventos de evolução registrados</p>
          </article>
          <article className="hall-stat">
            <div className="hall-stat-icon"><i className="bi bi-lightning-charge-fill"></i></div>
            <h2 className="hall-stat-value">{eventosXp}</h2>
            <p className="hall-stat-label">XP gerado por eventos</p>
          </article>
        </section>

        {/* Prestige Gallery */}
        <section className="hall-section mb-5 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="hall-section-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-4">
            <div style={{ maxWidth: "600px" }}>
              <div className="hall-section-kicker mb-2 gold-text">
                <i className="bi bi-arrow-up-right-circle me-1"></i> Galeria de Prestígio
              </div>
              <h2 className="hall-section-title mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                De {progressao.titulo_atual} até {progressao.proximo_titulo}
              </h2>
              <p className="hall-section-desc text-muted mb-0">
                Cada título representa uma fase da sua evolução. Títulos desbloqueados ficam iluminados; o título atual recebe destaque especial.
              </p>
            </div>

            <div className="hall-progress-card p-3 rounded" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(226, 201, 133, 0.1)", minWidth: "250px" }}>
              <div className="hall-progress-meta d-flex justify-content-between text-muted small mb-2">
                <span>Próximo título</span>
                <strong>{progressao.progresso_proximo}%</strong>
              </div>
              <div className="hall-progress-track progress mb-2" style={{ height: "6px", background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="hall-progress-fill progress-bar"
                  style={{ width: `${progressao.progresso_proximo}%`, background: "var(--gold)" }}
                ></div>
              </div>
              <div className="hall-next-title text-muted text-end" style={{ fontSize: "0.7rem" }}>
                {progressao.xp_restante} XP restantes
              </div>
            </div>
          </div>

          <div className="rank-groups d-flex flex-column gap-3">
            {Object.entries(progressao.grupos).map(([categoria, titulos]: any) => (
              <article key={categoria} className={`rank-group rank-${categoria.toLowerCase()} p-3 rounded`} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                <div className="rank-group-title d-flex justify-content-between align-items-center mb-2">
                  <h3 className="text-white mb-0" style={{ fontSize: "1rem" }}>{categoria}</h3>
                  <i className="bi bi-gem gold-text"></i>
                </div>

                <div className="rank-list d-flex gap-3 flex-wrap">
                  {titulos.map((titulo: any, idx: number) => (
                    <div
                      key={idx}
                      className={`rank-item p-2 rounded d-flex align-items-center gap-2 small ${
                        titulo.atual ? "is-current border border-warning" : titulo.desbloqueado ? "is-unlocked" : ""
                      }`}
                      style={{ background: "rgba(0,0,0,0.15)", opacity: titulo.desbloqueado || titulo.atual ? 1 : 0.4 }}
                    >
                      <div className="rank-status">
                        {titulo.atual ? (
                          <i className="bi bi-stars text-warning"></i>
                        ) : titulo.desbloqueado ? (
                          <i className="bi bi-check2 text-success"></i>
                        ) : (
                          <i className="bi bi-lock text-muted"></i>
                        )}
                      </div>

                      <div>
                        <div className="rank-name text-white fw-semibold">{titulo.nome}</div>
                        <div className="rank-xp text-muted" style={{ fontSize: "0.68rem" }}>{titulo.xp_minimo} XP necessários</div>
                      </div>

                      {titulo.atual && <span className="rank-current-pill badge bg-warning text-dark small" style={{ fontSize: "0.6rem" }}>Atual</span>}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Domain grid */}
        <section className="hall-section mb-4 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="hall-section-header mb-4">
            <div className="hall-section-kicker mb-2 gold-text">
              <i className="bi bi-grid-3x3-gap me-1"></i> Domínios da Ascensão
            </div>
            <h2 className="hall-section-title mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Sua evolução por área da vida</h2>
            <p className="hall-section-desc text-muted">
              Enquanto o Prestígio Global representa quem você está se tornando, os Domínios mostram onde sua energia está sendo investida.
            </p>
          </div>

          <div className="domain-grid d-flex flex-column gap-3">
            {dominiosAscensao.map((dominio) => (
              <article key={dominio.nome} className="domain-card p-3 rounded" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                <div className="domain-top d-flex gap-3 mb-2">
                  <div className="domain-icon fs-3 gold-text"><i className={`bi ${dominio.icone}`}></i></div>
                  <div>
                    <div className="domain-name fw-bold text-white" style={{ fontSize: "1rem" }}>{dominio.nome}</div>
                    <div className="domain-rank text-muted small">{dominio.titulo}</div>
                  </div>
                </div>

                <div className="domain-meta d-flex justify-content-between text-muted small mb-2">
                  <span>Progresso</span>
                  <strong>{dominio.progresso}%</strong>
                </div>
                <div className="domain-track progress" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="domain-fill progress-bar"
                    style={{ width: `${dominio.progresso}%`, background: "var(--gold-soft)" }}
                  ></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
