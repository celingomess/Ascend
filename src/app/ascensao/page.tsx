import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  calcularTituloAscend,
  calcularAvatarFrame,
} from "@/lib/utils";
import "@/styles/dashboard.css";

export const revalidate = 0; // Garantir dados em tempo real

interface CalendarioDia {
  dia: number;
  ativo: boolean;
  hoje: boolean;
  futuro: boolean;
}

function obterCalendarioConsistencia(eventos: any[]): CalendarioDia[] {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  const numDias = new Date(ano, mes + 1, 0).getDate();

  // Filtrar eventos do mês e ano atuais
  const diasAtivos = new Set<number>();
  eventos.forEach((e) => {
    if (e.criado_em) {
      const d = new Date(e.criado_em);
      if (d.getFullYear() === ano && d.getMonth() === mes) {
        diasAtivos.add(d.getDate());
      }
    }
  });

  const hojeDia = hoje.getDate();

  const calendario: CalendarioDia[] = [];
  for (let i = 1; i <= numDias; i++) {
    calendario.push({
      dia: i,
      ativo: diasAtivos.has(i),
      hoje: i === hojeDia,
      futuro: i > hojeDia,
    });
  }

  return calendario;
}

export default async function AscensaoPage() {
  // 1. Obter Usuário Padrão ID=1
  const usuario = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!usuario) {
    return notFound();
  }

  // 2. Buscar Eventos de Atividade
  const eventos = await prisma.user_events.findMany({
    where: { user_id: usuario.id },
    orderBy: { criado_em: "desc" },
  });

  const totalEventos = eventos.length;

  const sumResult = await prisma.user_events.aggregate({
    where: { user_id: usuario.id },
    _sum: { xp: true },
  });
  const eventosXp = sumResult._sum.xp ?? 0;

  // 3. Buscar Jornadas (Metas) para o Life Map
  const metas = await prisma.goals.findMany({
    where: { user_id: usuario.id },
  });

  const categorias = ["Carreira", "Estudos", "Saúde", "Projetos", "Finanças", "Pessoal"];
  const lifeMap: Record<string, number> = {};
  for (const cat of categorias) {
    const metasCat = metas.filter((m) => m.categoria === cat);
    if (metasCat.length > 0) {
      lifeMap[cat] = Math.round(
        metasCat.reduce((acc, m) => acc + (m.progresso || 0), 0) / metasCat.length
      );
    } else {
      lifeMap[cat] = 0;
    }
  }

  // 4. Gerar Calendário de Consistência
  const calendarioConsistencia = obterCalendarioConsistencia(eventos);
  const hoje = new Date();
  const mesAtual = hoje.toLocaleDateString("pt-BR", { month: "long" });
  const diasAtivosMes = calendarioConsistencia.filter((d) => d.ativo).length;

  // 5. Cálculos Gerais
  const xpTotal = usuario.xp_total ?? 0;
  const rankAtual = calcularTituloAscend(xpTotal);
  const avatarFrame = calcularAvatarFrame(xpTotal);

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="container-fluid py-4 px-lg-5 text-white">
      {/* Topbar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <Link href="/dashboard" className="btn btn-ascend-outline">
          <i className="bi bi-arrow-left me-1"></i> Voltar ao Dashboard
        </Link>

        <div className="d-flex gap-3">
          <Link href="/hall" className="btn btn-ascend-outline">
            <i className="bi bi-gem me-1"></i> Hall
          </Link>
          <Link href="/perfil" className="btn btn-ascend-outline">
            <i className="bi bi-person me-1"></i> Perfil
          </Link>
        </div>
      </div>

      <style>{`
        .consistency-calendar {
          display: grid;
          grid-template-columns: repeat(16, minmax(32px, 1fr));
          gap: 10px;
        }

        .consistency-day {
          height: 42px;
          border-radius: 13px;
          background: rgba(255, 250, 240, 0.045);
          border: 1px solid rgba(226, 201, 133, 0.09);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(243, 234, 216, 0.42);
          font-size: 0.78rem;
          font-weight: 800;
          transition: 0.22s ease;
        }

        .consistency-day.active {
          background: radial-gradient(circle at top left, rgba(226, 201, 133, 0.35), transparent 55%), rgba(226, 201, 133, 0.14);
          border-color: rgba(226, 201, 133, 0.32);
          color: var(--gold-soft);
          box-shadow: inset 0 0 0 1px rgba(226, 201, 133, 0.08), 0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .consistency-day.today {
          outline: 2px solid rgba(226, 201, 133, 0.42);
          outline-offset: 3px;
        }

        .consistency-day.future {
          opacity: 0.35;
        }

        .ascend-avatar-section {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }

        .ascend-avatar-frame {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle at top left, rgba(226,201,133,0.25), transparent 55*);
          border: 3px solid rgba(226,201,133,0.35);
          padding: 6px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        }

        .ascend-avatar-frame img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .ascend-avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(226,201,133,0.15), rgba(255,250,240,0.05));
        }

        .ascend-timeline {
          position: relative;
          padding-left: 20px;
          border-left: 2px solid rgba(226,201,133,0.08);
        }

        .timeline-item {
          position: relative;
          margin-bottom: 24px;
        }

        .timeline-dot {
          position: absolute;
          left: -31px;
          top: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #050906;
          border: 2px solid rgba(226,201,133,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: var(--gold-soft);
        }

        .timeline-dot.completed {
          background: var(--gold);
          border-color: var(--gold-soft);
          color: #000;
        }

        .timeline-title {
          font-weight: 700;
          color: #fff;
          font-size: 0.95rem;
        }

        .timeline-description {
          font-size: 0.85rem;
          color: #b8b0a5;
        }
      `}</style>

      {/* Hero Header */}
      <section className="ascend-avatar-section p-4 rounded mb-5" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
        <div className={`ascend-avatar-frame ${avatarFrame}`}>
          {usuario.avatar ? (
            <img src={`/uploads/${usuario.avatar}`} alt={usuario.nome} />
          ) : (
            <div className="ascend-avatar-placeholder">
              <i className="bi bi-person-fill fs-2 text-muted"></i>
            </div>
          )}
        </div>
        <div>
          <span className="badge-old mb-2"><i className="bi bi-graph-up-arrow me-1"></i> Ascensão</span>
          <h1 className="ascend-title" style={{ fontSize: "2rem" }}>Painel de Evolução</h1>
          <p className="text-muted mb-0 small">
            Nível {usuario.nivel} &middot; {rankAtual} &middot; {xpTotal} XP Acumulados
          </p>
        </div>
      </section>

      {/* Consistency Section */}
      <section className="ascend-card p-4 mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <span className="badge-old mb-2 d-inline-block">
              <i className="bi bi-calendar3 me-1"></i> Calendário de Consistência
            </span>
            <h3 className="ascend-title" style={{ fontSize: "1.3rem" }}>Seu ritmo neste mês</h3>
            <p className="text-muted mb-0 small">
              Cada marca representa um dia com atividade registrada dentro do Ascend.
            </p>
          </div>

          <div className="text-end">
            <div className="gold-text fw-bold" style={{ fontSize: "2rem", lineHeight: 1 }}>{diasAtivosMes}</div>
            <div className="text-muted small">dias ativos em {mesAtual}</div>
          </div>
        </div>

        {/* Responsive horizontal scroll wrap */}
        <div className="consistency-calendar-wrapper" style={{ overflowX: "auto", width: "100%", paddingBottom: "10px" }}>
          <div className="consistency-calendar" style={{ minWidth: "650px" }}>
            {calendarioConsistencia.map((dia) => (
              <div
                key={dia.dia}
                className={`consistency-day ${dia.ativo ? "active" : ""} ${dia.hoje ? "today" : ""} ${dia.futuro ? "future" : ""}`}
                title={`Dia ${dia.dia}`}
              >
                <span>{dia.dia}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid: Life Map & Timeline */}
      <section className="row">
        {/* Life Map Column */}
        <div className="col-lg-6 mb-4">
          <div className="ascend-card p-4 h-100">
            <span className="badge-old mb-3">
              <i className="bi bi-diagram-3 me-1"></i> Mapa da Vida
            </span>
            <h3 className="ascend-title mb-4" style={{ fontSize: "1.3rem" }}>Áreas em desenvolvimento</h3>

            <div className="d-flex flex-column gap-3">
              {Object.entries(lifeMap).map(([categoria, valor]) => (
                <div key={categoria} className="life-domain-card">
                  <div className="d-flex justify-content-between mb-2 small text-muted">
                    <span className="domain-label">{categoria}</span>
                    <span className="domain-value text-white fw-bold">{valor}%</span>
                  </div>
                  <div className="progress" style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px" }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${valor}%`,
                        background: "linear-gradient(90deg, #b89742 0%, #d8bd73 100%)",
                        borderRadius: "99px",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Events Column */}
        <div className="col-lg-6 mb-4">
          <div className="ascend-card p-4 h-100">
            <span className="badge-old mb-3">
              <i className="bi bi-clock-history me-1"></i> Linha do Tempo
            </span>
            <h3 className="ascend-title mb-4" style={{ fontSize: "1.3rem" }}>Eventos recentes</h3>

            {eventos.length > 0 ? (
              <div className="ascend-timeline">
                {eventos.slice(0, 6).map((evento) => (
                  <div key={evento.id} className="timeline-item">
                    <div className="timeline-dot completed">
                      {evento.tipo === "metas" ? (
                        <i className="bi bi-compass"></i>
                      ) : evento.tipo === "saude" ? (
                        <i className="bi bi-heart-pulse"></i>
                      ) : evento.tipo === "financas" ? (
                        <i className="bi bi-cash-stack"></i>
                      ) : (
                        <i className="bi bi-stars"></i>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-start gap-3 ms-2">
                      <div>
                        <div className="timeline-title text-white">{evento.titulo}</div>
                        {evento.descricao && <div className="timeline-description small mt-1">{evento.descricao}</div>}
                        <div className="text-muted mt-2" style={{ fontSize: "0.72rem" }}>
                          {formatDate(evento.criado_em)}
                        </div>
                      </div>
                      {evento.xp && <span className="badge-old">+{evento.xp} XP</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-clock-history display-4 gold-text"></i>
                <h4 className="ascend-title mt-3">Nenhum evento registrado ainda</h4>
                <p className="text-muted mb-0 small">Suas ações dentro do Ascend aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
