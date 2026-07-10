import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import MetasChart from "@/components/MetasChart";
import {
  calcularTituloAscend,
  calcularClasseEvolucao,
  obterProgressaoTitulos,
  gerarHeatmapConsistencia,
} from "@/lib/utils";

import "@/styles/dashboard.css";

export const revalidate = 0; // Evitar cache em desenvolvimento e produção para reatividade do banco de dados

export default async function DashboardPage() {
  // 1. Obter Usuário Padrão ID=1
  const user = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="ascend-title text-danger">Usuário padrão não encontrado.</h2>
        <p className="text-muted">Por favor, verifique a conexão com o banco MySQL.</p>
      </div>
    );
  }

  // 2. Buscar Jornadas (Metas)
  const metas = await prisma.goals.findMany({
    where: { user_id: user.id },
  });

  const totalMetas = metas.length;
  const metasConcluidas = metas.filter((m) => m.status === "Concluída").length;
  const metasEmAndamento = totalMetas - metasConcluidas;

  let progressoMedio = 0;
  if (totalMetas > 0) {
    progressoMedio = parseFloat(
      (metas.reduce((acc, m) => acc + (m.progresso || 0), 0) / totalMetas).toFixed(1)
    );
  }

  // Categoria Radar / Life Map
  const categorias = ["Carreira", "Estudos", "Saúde", "Projetos", "Finanças", "Pessoal"];
  const lifeMap: Record<string, number> = {};
  for (const cat of categorias) {
    const metasCat = metas.filter((m) => m.categoria === cat);
    if (metasCat.length > 0) {
      lifeMap[cat] = parseFloat(
        (metasCat.reduce((acc, m) => acc + (m.progresso || 0), 0) / metasCat.length).toFixed(1)
      );
    } else {
      lifeMap[cat] = 0;
    }
  }

  // 3. Contagem de Conquistas
  const conquistasTotal = await prisma.achievements.count({
    where: { user_id: user.id },
  });

  // 4. Buscar Eventos de Atividade
  const events = await prisma.user_events.findMany({
    where: { user_id: user.id },
    orderBy: { criado_em: "desc" },
    take: 8,
  });

  // Heatmap de Consistência (últimos 35 dias)
  const allEventsForHeatmap = await prisma.user_events.findMany({
    where: { user_id: user.id },
    select: { criado_em: true },
  });
  const heatmap = gerarHeatmapConsistencia(allEventsForHeatmap, 35);

  // 5. Momentum e Streaks de Metas Inteligentes
  const goalIds = metas.map((m) => m.id);
  let metasInteligentes: any[] = [];
  let blocks: any[] = [];

  if (goalIds.length > 0) {
    blocks = await prisma.goal_blocks.findMany({
      where: { goal_id: { in: goalIds } },
    });
    const blockIds = blocks.map((b) => b.id);

    if (blockIds.length > 0) {
      metasInteligentes = await prisma.goal_block_items.findMany({
        where: {
          block_id: { in: blockIds },
          tipo: "mini_meta",
          parent_id: null,
        },
      });
    }
  }

  let metasQuentes = 0;
  let metasFrias = 0;
  let melhorStreak = 0;
  let momentumTotal = 0;

  const hojeStr = new Date().toDateString();
  const ontemStr = new Date(Date.now() - 86400000).toDateString();

  for (const item of metasInteligentes) {
    let temperatura = "fria";
    const ultAtividade = item.ultima_atividade ? new Date(item.ultima_atividade).toDateString() : null;

    if (ultAtividade === hojeStr) {
      temperatura = "quente";
      metasQuentes++;
      momentumTotal += 100;
    } else if (ultAtividade === ontemStr) {
      temperatura = "morna";
      momentumTotal += 60;
    } else {
      metasFrias++;
      momentumTotal += 20;
    }

    if (item.melhor_streak && item.melhor_streak > melhorStreak) {
      melhorStreak = item.melhor_streak;
    }
  }

  const momentumMedio = metasInteligentes.length > 0 ? Math.round(momentumTotal / metasInteligentes.length) : 0;

  // 6. Próximas Ações
  const proximasAcoes: any[] = [];
  if (blocks.length > 0) {
    const blockIds = blocks.map((b) => b.id);
    const todosItens = await prisma.goal_block_items.findMany({
      where: { block_id: { in: blockIds }, concluido: false },
      take: 6,
    });

    for (const item of todosItens) {
      const bloco = blocks.find((b) => b.id === item.block_id);
      const meta = metas.find((m) => m.id === bloco?.goal_id);
      if (meta && bloco) {
        proximasAcoes.push({
          jornada: meta.titulo,
          area: bloco.titulo,
          acao: item.titulo,
          tipo: item.tipo === "mini_meta" ? "Meta" : "Subtarefa",
        });
      }
    }
  }

  // Obter classe e ranques
  const classeEvolucao = calcularClasseEvolucao(metas);
  const rankAtual = calcularTituloAscend(user.xp_total ?? 0);
  const progressaoRanque = obterProgressaoTitulos(user.xp_total ?? 0);

  return (
    <div className="container-fluid py-4">
      {/* Welcome Hero Card */}
      <section className="dashboard-command-hero mb-5">
        <div className="dashboard-command-inner">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div className="d-flex flex-wrap gap-2">
              <span className="badge-old">
                <i className="bi bi-stars"></i> Ascend OS
              </span>
              <span className="badge-old">
                <i className="bi bi-compass"></i> Início
              </span>
            </div>
            <Link href="/metas/nova" className="btn btn-ascend">
              <i className="bi bi-plus-lg"></i> Nova Jornada
            </Link>
          </div>

          <div>
            <h1 className="dashboard-hero-title mb-4">{user.nome}</h1>
            <p className="text-muted fs-5 mb-0" style={{ maxWidth: "760px" }}>
              Construindo sua próxima versão com consistência, direção e evidências reais de evolução.
            </p>

            <div className="dashboard-identity">
              <div>
                <div className="dashboard-rank mb-2">
                  <span className="rank-label">{rankAtual}</span>
                  <span className="rank-divider"></span>
                  <span className="rank-level">Nível {user.nivel}</span>
                </div>

                {progressaoRanque && (
                  <div className="dashboard-rank-progress mb-3" style={{ maxWidth: "460px", width: "100%" }}>
                    <div
                      className="d-flex justify-content-between align-items-center mb-1"
                      style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}
                    >
                      <span>
                        Próximo: <strong>{progressaoRanque.proximo_titulo}</strong>
                      </span>
                      <span>
                        {progressaoRanque.xp_atual} / {progressaoRanque.xp_proximo} XP
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "99px" }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${progressaoRanque.progresso_proximo}%`,
                          background: "linear-gradient(90deg, #b89742 0%, #d8bd73 100%)",
                          borderRadius: "99px",
                        }}
                        aria-valuenow={progressaoRanque.progresso_proximo}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    {progressaoRanque.xp_restante > 0 && (
                      <div className="text-muted text-end mt-1" style={{ fontSize: "0.65rem" }}>
                        Faltam {progressaoRanque.xp_restante} XP para subir
                      </div>
                    )}
                  </div>
                )}

                {/* Classe Card */}
                <div className={`dashboard-class-card class-theme-${classeEvolucao.tema}`}>
                  <div className="dashboard-class-icon">
                    <span className={`bi ${classeEvolucao.icone}`} style={{ fontSize: "1.5rem" }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="dashboard-class-title">{classeEvolucao.classe}</div>
                    <div className="dashboard-class-subtitle">{classeEvolucao.subtitulo}</div>
                    <div className="dashboard-class-domain">
                      Domínio Principal &middot; {classeEvolucao.dominio}
                    </div>
                    <div className="dashboard-class-description">{classeEvolucao.descricao}</div>
                  </div>
                </div>

                {/* Insight Indicators */}
                <div className="dashboard-insight-grid">
                  <div className="dashboard-insight-pill">
                    <strong>{totalMetas}</strong>
                    <span>Jornadas criadas</span>
                  </div>
                  <div className="dashboard-insight-pill">
                    <strong>{metasConcluidas}</strong>
                    <span>Jornadas concluídas</span>
                  </div>
                  <div className="dashboard-insight-pill">
                    <strong>{user.xp_total}</strong>
                    <span>XP acumulado</span>
                  </div>
                  <div className="dashboard-insight-pill">
                    <strong>{momentumMedio}</strong>
                    <span>Momentum médio</span>
                  </div>
                </div>
              </div>

              {/* Círculo de Evolução Geral (Direita) */}
              <div className="dashboard-evolution">
                <div className="dashboard-evolution-number">{progressoMedio}%</div>
                <div className="dashboard-evolution-label">Evolução Geral</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout Principal */}
      <div className="dashboard-split-layout">
        {/* Coluna Esquerda: Hub e Foco */}
        <div className="dashboard-col-left">
          {/* Hub de Sistemas de Suporte */}
          <section className="dashboard-hub-section mb-4">
            <div className="dashboard-section-header">
              <div>
                <div className="dashboard-section-label">Hub de Performance</div>
                <h2 className="dashboard-section-title mb-0">Sistemas de Suporte</h2>
              </div>
            </div>
            <div className="row row-cols-1 row-cols-md-2 g-3 mt-2">
              <div className="col">
                <div
                  className="ascend-card p-3 d-flex align-items-center justify-content-between gap-3 h-100"
                  style={{
                    border: "1px solid rgba(226, 201, 133, 0.15)",
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.0) 100%)",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="action-icon-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        background: "rgba(72, 180, 120, 0.1)",
                        border: "1px solid rgba(72, 180, 120, 0.25)",
                      }}
                    >
                      <span className="bi bi-heart-pulse-fill text-success" style={{ fontSize: "1.25rem" }} />
                    </div>
                    <div>
                      <h4 className="ascend-title mb-0" style={{ fontSize: "1.05rem" }}>
                        Saúde & Nutrição
                      </h4>
                      <p className="text-muted small mb-0" style={{ fontSize: "0.72rem" }}>
                        Macros, calorias e cargas físicas
                      </p>
                    </div>
                  </div>
                  <Link href="/saude" className="btn btn-ascend-outline btn-sm">
                    Abrir
                  </Link>
                </div>
              </div>
              <div className="col">
                <div
                  className="ascend-card p-3 d-flex align-items-center justify-content-between gap-3 h-100"
                  style={{
                    border: "1px solid rgba(226, 201, 133, 0.15)",
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.0) 100%)",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="action-icon-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        background: "rgba(184, 122, 63, 0.1)",
                        border: "1px solid rgba(184, 122, 63, 0.25)",
                      }}
                    >
                      <span className="bi bi-bank text-warning" style={{ fontSize: "1.25rem" }} />
                    </div>
                    <div>
                      <h4 className="ascend-title mb-0" style={{ fontSize: "1.05rem" }}>
                        Finanças Pessoais
                      </h4>
                      <p className="text-muted small mb-0" style={{ fontSize: "0.72rem" }}>
                        Fluxo de caixa e saldo de evolução
                      </p>
                    </div>
                  </div>
                  <Link href="/financas" className="btn btn-ascend-outline btn-sm">
                    Abrir
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Próximos Movimentos (Foco) */}
          <section className="dashboard-next-actions-section mb-4">
            <div className="dashboard-section-header">
              <div>
                <div className="dashboard-section-label">Foco de Hoje</div>
                <h2 className="dashboard-section-title mb-0">Seus Próximos Movimentos</h2>
              </div>
            </div>
            {proximasAcoes.length === 0 ? (
              <div className="text-center py-4 border rounded mt-3" style={{ border: "1px dashed var(--border) !important" }}>
                <p className="text-muted small mb-0">Nenhuma ação imediata pendente. Crie ou continue uma Jornada!</p>
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 g-3 mt-2">
                {proximasAcoes.map((action, idx) => (
                  <div className="col" key={idx}>
                    <div
                      className="ascend-card p-3 d-flex align-items-center justify-content-between gap-3 h-100"
                      style={{
                        border: "1px solid var(--border)",
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="action-icon-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "rgba(212, 175, 55, 0.1)",
                            border: "1px solid rgba(212, 175, 55, 0.3)",
                          }}
                        >
                          <span className="bi bi-bullseye gold-text" style={{ fontSize: "1.1rem" }} />
                        </div>
                        <div>
                          <div className="text-muted small mb-1" style={{ fontSize: "0.68rem" }}>
                            {action.jornada} &middot; {action.area}
                          </div>
                          <h4 className="ascend-title mb-0" style={{ fontSize: "1rem" }}>
                            {action.acao}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna Direita: Heatmap e Atividades */}
        <div className="dashboard-col-right">
          {/* Ritmo de evolução */}
          <div className="ascend-card p-4 performance-card mb-4">
            <span className="badge-old mb-3">
              <i className="bi bi-speedometer2"></i> Centro de Performance
            </span>
            <h3 className="ascend-title mb-4">Seu ritmo de evolução</h3>
            <div className="performance-grid">
              <div className="life-domain-card h-100">
                <span className="domain-label">Metas Quentes</span>
                <strong className="domain-value d-block mt-2">{metasQuentes}</strong>
                <small className="text-muted">Ativas recentemente</small>
              </div>
              <div className="life-domain-card h-100">
                <span className="domain-label">Metas Frias</span>
                <strong className="domain-value d-block mt-2">{metasFrias}</strong>
                <small className="text-muted">Precisam de atenção</small>
              </div>
              <div className="life-domain-card h-100">
                <span className="domain-label">
                  <i className="bi bi-fire streak-icon"></i> Streak Global
                </span>
                <strong className="domain-value d-block mt-2">{user.streak_atual ?? 0}</strong>
                <small className="text-muted">Dias seguidos</small>
              </div>
              <div className="life-domain-card h-100">
                <span className="domain-label">
                  <i className="bi bi-trophy record-icon"></i> Recorde Global
                </span>
                <strong className="domain-value d-block mt-2">{user.melhor_streak ?? 0}</strong>
                <small className="text-muted">Melhor sequência</small>
              </div>
              <div className="life-domain-card h-100">
                <span className="domain-label">Momentum Médio</span>
                <strong className="domain-value d-block mt-2">{momentumMedio}</strong>
                <small className="text-muted">Ritmo geral</small>
              </div>
            </div>
          </div>

          {/* Calendário de Consistência (Heatmap) */}
          <div className="ascend-card p-4 dashboard-heatmap-card mb-4">
            <div className="heatmap-header">
              <div>
                <span className="badge-old mb-3">
                  <i className="bi bi-calendar-check"></i> Consistência
                </span>
                <h3 className="heatmap-title">Evolução recente</h3>
                <p className="heatmap-subtitle">Seus últimos 35 dias de atividade dentro do Ascend.</p>
              </div>
              <div className="heatmap-legend">
                <span>Menos</span>
                <span className="heatmap-legend-dot"></span>
                <span className="heatmap-legend-dot active"></span>
                <span>Mais</span>
              </div>
            </div>
            <div className="heatmap-grid mt-3">
              {heatmap.map((dia, idx) => (
                <div
                  key={idx}
                  className={`heatmap-day ${dia.ativo ? "active" : ""} ${dia.hoje ? "today" : ""}`}
                  title={dia.data}
                />
              ))}
            </div>
          </div>

          {/* Gráfico de Conclusão */}
          <div className="ascend-card p-4 dashboard-chart-card mb-4">
            <div className="mb-4">
              <span className="badge-old mb-2">
                <i className="bi bi-pie-chart"></i> Estado atual
              </span>
              <h3 className="ascend-title mb-1">Jornadas</h3>
              <p className="text-muted mb-0">Distribuição entre jornadas em andamento e concluídas.</p>
            </div>
            <MetasChart dadosStatus={[metasEmAndamento, metasConcluidas]} progressoMedio={progressoMedio} />
            <div className="chart-legend-premium mt-4">
              <div className="chart-legend-item">
                <span className="legend-dot legend-dot-primary"></span>
                <div>
                  <strong>{metasEmAndamento}</strong>
                  <small>Em andamento</small>
                </div>
              </div>
              <div className="chart-legend-item">
                <span className="legend-dot legend-dot-secondary"></span>
                <div>
                  <strong>{metasConcluidas}</strong>
                  <small>Concluídas</small>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa da Vida (Life Map) */}
          <div className="ascend-card p-4 mb-4">
            <span className="badge-old mb-3">
              <i className="bi bi-diagram-3"></i> Mapa da Vida
            </span>
            <h3 className="ascend-title mb-4">Áreas em desenvolvimento</h3>
            {Object.entries(lifeMap).map(([categoria, valor]) => (
              <div className="life-domain-card mb-3" key={categoria}>
                <div className="d-flex justify-content-between mb-2">
                  <span className="domain-label">{categoria}</span>
                  <span className="domain-value">{valor}%</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${valor}%` }} role="progressbar">
                    {valor}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
