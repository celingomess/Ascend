"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { obterClasseCorRank } from "@/lib/utils";
import "@/styles/perfil.css";

interface User {
  id: number;
  nome: string;
  email: string;
  avatar: string | null;
  nivel: number | null;
  xp_total: number | null;
  streak_atual: number | null;
  melhor_streak: number | null;
}

interface Insignia {
  titulo: string;
  descricao: string;
  icone: string;
  raridade: string;
}

interface Domain {
  nome: string;
  icone: string;
  progresso: number;
  titulo: string;
  proximo_titulo: string;
  progresso_restante: number | null;
  marcos: any[];
}

interface PerfilClientInitialProps {
  usuario: User;
  totalJornadas: number;
  jornadasConcluidas: number;
  conquistasTotal: number;
  insignias: Insignia[];
  recordeGlobal: number;
  rankAtual: string;
  avatarFrame: string;
  progressaoRanque: any;
  dominiosAscensao: Domain[];
}

export default function PerfilClientInitial({
  usuario,
  totalJornadas,
  jornadasConcluidas,
  conquistasTotal,
  insignias,
  recordeGlobal,
  rankAtual,
  avatarFrame,
  progressaoRanque,
  dominiosAscensao,
}: PerfilClientInitialProps) {
  const [rankTab, setRankTab] = useState<"global" | "areas">("global");
  const [expandedRanks, setExpandedRanks] = useState<Record<string, boolean>>({});
  const [selectedAreaRank, setSelectedAreaRank] = useState<string>(
    dominiosAscensao[0]?.nome || "Carreira"
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Handler para editar formulário
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/perfil/api/editar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage("Perfil atualizado com sucesso!");
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          (window as any).AscendSFX.playClick();
        }
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setErrorMessage(data.message || "Erro ao atualizar dados.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const activeArea = dominiosAscensao.find((d) => d.nome === selectedAreaRank);

  return (
    <main className="profile-page py-4 px-lg-5 text-white">
      <div className="profile-shell container-fluid">
        {/* Profile Topbar */}
        <div className="profile-topbar d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <a href="/dashboard" className="profile-back text-decoration-none">
            <i className="bi bi-arrow-left me-1"></i> Voltar ao Dashboard
          </a>

          <div className="profile-actions d-flex gap-3">
            <a href="/ascensao" className="profile-action text-decoration-none">
              <i className="bi bi-graph-up-arrow me-1"></i> Ascensão
            </a>
            <a href="/hall" className="profile-action text-decoration-none">
              <i className="bi bi-gem me-1"></i> Hall
            </a>
            <a href="/dashboard" className="profile-action text-decoration-none" style={{ color: "#ff4d4d" }}>
              <i className="bi bi-box-arrow-right me-1"></i> Sair
            </a>
          </div>
        </div>

        {/* Profile Hero Panel */}
        <section className="profile-hero mb-5 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="profile-hero-content d-flex justify-content-between align-items-center flex-wrap gap-4">
            <div className="flex-grow-1" style={{ maxWidth: "680px" }}>
              <div className="profile-eyebrow mb-2 gold-text">
                <i className="bi bi-person-badge me-1"></i> Perfil Ascend
              </div>
              <h1 className="profile-title mb-3" style={{ fontSize: "2.5rem", fontFamily: "'Cormorant Garamond', serif" }}>
                Sua identidade <span className="gold-text">de evolução.</span>
              </h1>
              <p className="profile-subtitle text-muted">
                Ajuste seus dados, personalize sua presença no Ascend e acompanhe os principais indicadores que representam sua trajetória dentro do sistema.
              </p>
            </div>

            <aside className="profile-card-user text-center p-4 rounded" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(226, 201, 133, 0.1)", minWidth: "260px" }}>
              <div className={`profile-avatar mx-auto mb-3 ${avatarFrame}`} style={{ width: "120px", height: "120px" }}>
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

              <h2 className="profile-user-name mb-1" style={{ fontSize: "1.3rem" }}>{usuario.nome}</h2>
              <div className="profile-user-email text-muted small mb-2">{usuario.email}</div>
              <div className={`profile-rank mb-2 ${obterClasseCorRank(usuario.xp_total ?? 0)}`} style={{ fontWeight: 600 }}>{rankAtual}</div>
              <div className="text-muted small">
                Nível {usuario.nivel} &middot; {usuario.xp_total} XP
              </div>
              <div className="text-muted small mt-2">
                Recorde de consistência: <strong className="text-white">{recordeGlobal} dias</strong>
              </div>
            </aside>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="profile-grid mb-5">
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-stars"></i></div>
            <h2 className="profile-stat-value">{usuario.xp_total}</h2>
            <p className="profile-stat-label">XP Acumulado</p>
          </article>
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-arrow-up-circle"></i></div>
            <h2 className="profile-stat-value">{usuario.nivel}</h2>
            <p className="profile-stat-label">Nível Atual</p>
          </article>
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-compass"></i></div>
            <h2 className="profile-stat-value">{totalJornadas}</h2>
            <p className="profile-stat-label">Jornadas Criadas</p>
          </article>
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-check2-circle"></i></div>
            <h2 className="profile-stat-value">{jornadasConcluidas}</h2>
            <p className="profile-stat-label">Jornadas Concluídas</p>
          </article>
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-trophy-fill"></i></div>
            <h2 className="profile-stat-value">{conquistasTotal}</h2>
            <p className="profile-stat-label">Conquistas</p>
          </article>
          <article className="profile-stat">
            <div className="profile-stat-icon"><i className="bi bi-fire"></i></div>
            <h2 className="profile-stat-value">{recordeGlobal}</h2>
            <p className="profile-stat-label">Melhor Streak</p>
          </article>
        </section>

        {/* Badges / Insignias Section */}
        <section className="profile-badges mb-5 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="profile-panel-kicker mb-2 gold-text">
            <i className="bi bi-award me-1"></i> Galeria de Insígnias
          </div>
          <h2 className="profile-panel-title mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Seu legado desbloqueado</h2>
          <p className="profile-panel-desc text-muted mb-4">Cada insígnia representa um marco importante da sua evolução.</p>

          {insignias.length > 0 ? (
            <div className="profile-badges-grid">
              {insignias.map((insignia, idx) => (
                <div key={idx} className="profile-badge p-3 rounded text-center">
                  <div className={`profile-badge-header badge-${insignia.raridade} mb-2`}>
                    <i className={`bi ${insignia.icone} fs-4`}></i>
                    <span className="profile-badge-title d-block mt-1 fw-bold">{insignia.titulo}</span>
                  </div>
                  <div className="profile-badge-desc text-muted small">{insignia.descricao}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted small text-center py-4">Nenhuma insígnia conquistada ainda. Complete suas metas e treinos!</p>
          )}
        </section>

        {/* Rank Progression Section */}
        {progressaoRanque && (
          <section className="profile-ranks-progression mb-5 p-4 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <div className="profile-panel-kicker mb-1 gold-text">
                  <i className="bi bi-shield-shaded me-1"></i> Progresso de Ranques
                </div>
                <h2 className="profile-panel-title mb-0" style={{ fontFamily: "'Cormorant Garamond', serif" }}>A Jornada da Ascensão</h2>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${rankTab === "global" ? "btn-ascend active" : "btn-ascend-outline"}`}
                  onClick={() => setRankTab("global")}
                >
                  Ranque Global
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${rankTab === "areas" ? "btn-ascend active" : "btn-ascend-outline"}`}
                  onClick={() => setRankTab("areas")}
                >
                  Ranques por Área
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: GLOBAL ROADMAP */}
            {rankTab === "global" && (
              <div id="rank-content-global">
                <p className="profile-panel-desc mb-4 text-muted">
                  Seu título atual é <strong className="gold-text">{progressaoRanque.titulo_atual}</strong>.{" "}
                  {progressaoRanque.xp_restante > 0 ? (
                    <>
                      Faltam <strong className="text-white">{progressaoRanque.xp_restante} XP</strong> para atingir{" "}
                      <strong>{progressaoRanque.proximo_titulo}</strong>.
                    </>
                  ) : (
                    "Você atingiu o ranque máximo de evolução!"
                  )}
                </p>

                <div className="profile-rank-bar-container mb-4">
                  <div className="d-flex justify-content-between text-muted small mb-2">
                    <span>Progresso do Ranque: {progressaoRanque.progresso_proximo}%</span>
                    <span>
                      {progressaoRanque.xp_atual} / {progressaoRanque.xp_proximo} XP
                    </span>
                  </div>
                  <div className="progress" style={{ height: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "99px" }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progressaoRanque.progresso_proximo}%`,
                        background: "linear-gradient(90deg, #b89742 0%, #d8bd73 100%)",
                        boxShadow: "0 0 10px rgba(216, 189, 115, 0.3)",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="profile-ranks-road d-flex flex-column gap-3">
                  {Object.entries(progressaoRanque.grupos).map(([categoria, subranques]: any) => {
                    const isUnlocked = subranques.some((sub: any) => sub.desbloqueado);
                    const isExpanded = isUnlocked || !!expandedRanks[categoria];

                    return (
                      <div
                        key={categoria}
                        className={`road-group-card p-3 rounded ${isUnlocked ? "unlocked" : ""}`}
                        style={{
                          background: "rgba(255,255,255,0.01)",
                          border: "1px solid rgba(255,255,255,0.03)",
                        }}
                      >
                        <div
                          className="d-flex justify-content-between align-items-center mb-2"
                          style={{ cursor: isUnlocked ? "default" : "pointer" }}
                          onClick={() => {
                            if (!isUnlocked) {
                              setExpandedRanks((prev) => ({
                                ...prev,
                                [categoria]: !prev[categoria],
                              }));
                            }
                          }}
                        >
                          <h3 className="road-group-title text-white mb-0" style={{ fontSize: "1rem" }}>
                            {categoria}
                          </h3>
                          {!isUnlocked && (
                            <span className="text-muted small" style={{ fontSize: "0.75rem", userSelect: "none" }}>
                              {isExpanded ? (
                                <>
                                  Ocultar <i className="bi bi-chevron-up ms-1"></i>
                                </>
                              ) : (
                                <>
                                  Expandir <i className="bi bi-chevron-down ms-1"></i>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="road-subranks d-flex gap-3 flex-wrap">
                            {subranques.map((sub: any, idx: number) => (
                              <div
                                key={idx}
                                className={`road-subrank p-2 rounded small ${
                                  sub.atual ? "active border border-warning" : sub.desbloqueado ? "unlocked" : "locked"
                                }`}
                                style={{ background: "rgba(0,0,0,0.15)", opacity: sub.desbloqueado || sub.atual ? 1 : 0.4 }}
                              >
                                <span className="road-subrank-name">
                                  {sub.atual ? (
                                    <i className="bi bi-pin-angle-fill me-1 text-warning"></i>
                                  ) : sub.desbloqueado ? (
                                    <i className="bi bi-check-circle-fill me-1 text-success"></i>
                                  ) : (
                                    <i className="bi bi-lock-fill me-1"></i>
                                  )}
                                  {sub.nome}
                                </span>
                                <span className="road-subrank-xp d-block text-muted" style={{ fontSize: "0.68rem" }}>
                                  {sub.xp_minimo} XP
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: DOMAIN ROADS */}
            {rankTab === "areas" && (
              <div id="rank-content-areas">
                <p className="profile-panel-desc mb-4 text-muted">
                  Selecione um domínio de evolução para visualizar o caminho de ranques detalhados disponíveis nessa área.
                </p>

                <div className="d-flex align-items-center gap-3 mb-4">
                  <label htmlFor="select-area-rank" className="text-muted small mb-0">Visualizar Área:</label>
                  <select
                    className="profile-input mb-0"
                    id="select-area-rank"
                    value={selectedAreaRank}
                    onChange={(e) => setSelectedAreaRank(e.target.value)}
                    style={{
                      maxWidth: "250px",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      borderColor: "rgba(219, 190, 112, 0.2)",
                      padding: "8px 12px",
                      borderRadius: "10px",
                    }}
                  >
                    {dominiosAscensao.map((dominio) => (
                      <option key={dominio.nome} value={dominio.nome}>
                        {dominio.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {activeArea && (
                  <div className="area-road-list p-3 rounded" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                      <h4 className="gold-text mb-0" style={{ fontSize: "1.2rem" }}>
                        <i className={`bi ${activeArea.icone} me-2`}></i> {activeArea.nome}
                      </h4>
                      <span className="badge-old">
                        Média da Área: <strong>{activeArea.progresso}%</strong>
                      </span>
                    </div>

                    <div className="road-horizontal-scroll" style={{ overflowX: "auto", paddingBottom: "15px" }}>
                      <div className="road-horizontal-track d-flex gap-4">
                        {activeArea.marcos.map((marco: any, idx: number) => (
                          <div
                            key={idx}
                            className={`road-horizontal-node text-center p-3 rounded ${
                              marco.atual ? "active bg-dark" : marco.desbloqueado ? "unlocked" : "locked"
                            }`}
                            style={{ minWidth: "150px", background: "rgba(0,0,0,0.2)", opacity: marco.desbloqueado || marco.atual ? 1 : 0.4 }}
                          >
                            <div className="road-node-dot mb-2">
                              {marco.atual ? (
                                <i className="bi bi-pin-angle-fill text-warning fs-4"></i>
                              ) : marco.desbloqueado ? (
                                <i className="bi bi-check-lg text-success fs-4"></i>
                              ) : (
                                <i className="bi bi-lock-fill text-muted fs-4"></i>
                              )}
                            </div>
                            <div className="road-node-content">
                              <div className="road-node-title fw-bold text-white small">{marco.titulo}</div>
                              <div className="road-node-pct text-muted" style={{ fontSize: "0.75rem" }}>{marco.percentual}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Content Edit Form & Domain Progress Grid */}
        <section className="profile-content-grid">
          {/* Edit Form */}
          <article className="profile-panel">
            {successMessage && (
              <div className="profile-notice mb-3" style={{ background: "rgba(40,167,69,0.12)", color: "#28a745", padding: "12px", borderRadius: "8px" }}>
                <i className="bi bi-check2-circle me-1"></i> {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="profile-notice mb-3" style={{ background: "rgba(220,53,69,0.12)", color: "#dc3545", padding: "12px", borderRadius: "8px" }}>
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {errorMessage}
              </div>
            )}

            <div className="profile-panel-kicker mb-2 gold-text">
              <i className="bi bi-sliders me-1"></i> Dados Pessoais
            </div>
            <h2 className="profile-panel-title mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Editar perfil</h2>
            <p className="profile-panel-desc text-muted mb-4">
              Mantenha suas informações essenciais atualizadas. O avatar ajuda a tornar a experiência mais pessoal sem perder o visual premium.
            </p>

            <form onSubmit={handleSubmit} className="profile-form" encType="multipart/form-data">
              <div className="profile-form-row row">
                <div className="profile-field col-md-6 mb-3">
                  <label htmlFor="nome">Nome</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    className="profile-input"
                    defaultValue={usuario.nome}
                    required
                  />
                </div>
                <div className="profile-field col-md-6 mb-3">
                  <label htmlFor="email">E-mail</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="profile-input"
                    defaultValue={usuario.email}
                    required
                  />
                </div>
              </div>

              <div className="profile-field mb-3">
                <label htmlFor="avatar">Avatar</label>
                <input type="file" id="avatar" name="avatar" className="profile-input" accept="image/*" />
                <div className="profile-help text-muted">Formatos recomendados: JPG, PNG ou WEBP.</div>
              </div>

              <div className="profile-form-row row">
                <div className="profile-field col-md-6 mb-3">
                  <label htmlFor="senha_atual">Senha Atual</label>
                  <input
                    type="password"
                    id="senha_atual"
                    name="senha_atual"
                    className="profile-input"
                    placeholder="Necessária para alterar senha"
                  />
                </div>
                <div className="profile-field col-md-6 mb-3">
                  <label htmlFor="nova_senha">Nova Senha</label>
                  <input
                    type="password"
                    id="nova_senha"
                    name="nova_senha"
                    className="profile-input"
                    placeholder="Deixe vazio para manter a atual"
                  />
                </div>
              </div>

              <button type="submit" className="profile-submit w-100" disabled={loading}>
                {loading ? "Salvando..." : (
                  <>
                    <i className="bi bi-check2-circle me-1"></i> Salvar alterações
                  </>
                )}
              </button>
            </form>
          </article>

          {/* Domain Progress */}
          <aside className="profile-panel">
            <div className="profile-panel-kicker mb-2 gold-text">
              <i className="bi bi-grid-3x3-gap me-1"></i> Domínios da Ascensão
            </div>
            <h2 className="profile-panel-title mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Sua evolução por área</h2>
            <p className="profile-panel-desc text-muted mb-4">
              Cada domínio mostra onde sua energia está sendo investida e qual título representa sua fase atual naquela área de foco.
            </p>

            <div className="profile-domains-grid d-flex flex-column gap-3">
              {dominiosAscensao.map((dominio) => (
                <article key={dominio.nome} className="profile-domain-card p-3 rounded" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="profile-domain-top d-flex gap-3 mb-2">
                    <div className="profile-domain-icon fs-3 gold-text"><i className={`bi ${dominio.icone}`}></i></div>
                    <div>
                      <div className="profile-domain-name fw-bold text-white" style={{ fontSize: "1rem" }}>{dominio.nome}</div>
                      <div className="profile-domain-rank text-muted small">{dominio.titulo}</div>
                    </div>
                  </div>

                  <div className="profile-domain-meta d-flex justify-content-between text-muted small mb-2">
                    <span>Progresso</span>
                    <strong>{dominio.progresso}%</strong>
                  </div>
                  <div className="profile-domain-track progress" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="profile-domain-fill progress-bar"
                      style={{ width: `${dominio.progresso}%`, background: "var(--gold-soft)" }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-2 text-muted" style={{ fontSize: "0.7rem", opacity: 0.85 }}>
                    {dominio.progresso_restante !== null ? (
                      <>
                        <span>
                          Próximo: <strong className="gold-text">{dominio.proximo_titulo}</strong>
                        </span>
                        <span>Faltam {dominio.progresso_restante}%</span>
                      </>
                    ) : (
                      <span className="text-success">
                        <i className="bi bi-star-fill me-1"></i> Título Máximo Atingido
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
