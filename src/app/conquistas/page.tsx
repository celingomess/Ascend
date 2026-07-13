import React from "react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import "@/styles/conquistas.css";

export const revalidate = 0; // Garantir dados em tempo real

export default async function ConquistasPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  // Buscar conquistas desbloqueadas do usuário logado
  const conquistas = await prisma.achievements.findMany({
    where: { user_id: session.user.id },
    orderBy: { data_desbloqueio: "desc" },
  });

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="container py-5">
      {/* Hero Banner */}
      <section className="ascend-hero mb-5">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="badge-old mb-3">
              <i className="bi bi-award"></i> Legado de Evolução
            </span>
            <h1 className="display-4 ascend-title mb-3">Suas Conquistas</h1>
            <p className="text-muted fs-5 mb-0">
              Cada conquista representa um compromisso cumprido consigo mesmo e sua evolução pessoal.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ascend-outline mt-3">
            <i className="bi bi-arrow-left me-1"></i> Voltar ao Painel
          </Link>
        </div>
      </section>

      {/* Grid of Achievements */}
      {conquistas.length > 0 ? (
        <div className="achievements-grid">
          {conquistas.map((conquista) => {
            const raridadeClass = (conquista.raridade || "comum").toLowerCase();

            return (
              <div key={conquista.id} className="achievement-card-wrapper animate-fade-in">
                <div className={`achievement-card ${raridadeClass}`}>
                  {/* Front of the Card */}
                  <div className="card-face card-front">
                    <div className="achievement-icon">
                      <i className={`bi ${conquista.icone || "bi-award-fill"}`}></i>
                    </div>
                    <h3 className="achievement-title">{conquista.titulo}</h3>
                    <span className="rarity-badge">{conquista.raridade || "Comum"}</span>
                  </div>

                  {/* Back of the Card (Flips on hover) */}
                  <div className="card-face card-back">
                    <div className="xp-badge">+{conquista.xp || 10} XP</div>
                    <p className="achievement-desc">
                      {conquista.descricao || "Conquista secreta desbloqueada."}
                    </p>
                    <div className="unlock-date">
                      <i className="bi bi-calendar-check me-1"></i>
                      {formatDate(conquista.data_desbloqueio)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ascend-card p-5 text-center">
          <i className="bi bi-trophy display-1 gold-text"></i>
          <h3 className="ascend-title mt-4">Nenhuma conquista ainda</h3>
          <p className="text-muted">
            Continue executando suas rotinas e tarefas. Suas primeiras conquistas aparecerão aqui!
          </p>
          <Link href="/dashboard" className="btn btn-ascend mt-3">
            Começar a Evoluir
          </Link>
        </div>
      )}
    </div>
  );
}
