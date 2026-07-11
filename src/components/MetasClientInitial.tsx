"use client";

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useLevelUp } from "./LevelUpContext";
import "@/styles/metas.css";

interface Goal {
  id: number;
  user_id: number;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status: string | null;
  prazo: Date | null;
  progresso: number | null;
  data_criacao: Date | null;
  cover_image: string | null;
}

interface MetasClientInitialProps {
  initialMetas: Goal[];
}

function getCover(category: string, customCover: string | null) {
  if (customCover) return `/uploads/${customCover}`;
  switch (category) {
    case "Carreira":
      return "/images/covers/carreiras.jpg";
    case "Estudos":
      return "/images/covers/estudos.jpg";
    case "Saúde":
      return "/images/covers/saude.jpg";
    case "Projetos":
      return "/images/covers/projetos.jpg";
    case "Finanças":
      return "/images/covers/financas.jpg";
    default:
      return "/images/covers/pessoal.jpg";
  }
}

export default function MetasClientInitial({ initialMetas }: MetasClientInitialProps) {
  const [metas, setMetas] = useState<Goal[]>(initialMetas);
  const { triggerLevelUp } = useLevelUp();

  // Concluir Jornada
  const handleConcluir = async (id: number) => {
    try {
      const res = await fetch(`/metas/api/${id}/concluir`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        if (data.nivel_subiu) {
          triggerLevelUp(data.usuario_nivel - 1, data.usuario_nivel);
        } else {
          if (typeof window !== "undefined" && (window as any).AscendSFX) {
            (window as any).AscendSFX.playSuccess();
          }
          confetti({
            particleCount: 150,
            spread: 85,
            origin: { y: 0.6 },
          });
          alert("Parabéns! Jornada concluída com sucesso! (+50 XP)");
          window.location.reload();
        }
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Jornada
  const handleExcluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta jornada e todo o seu progresso? Esta ação é irreversível.")) {
      return;
    }

    try {
      const res = await fetch(`/metas/api/${id}/excluir`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setMetas(metas.filter((m) => m.id !== id));
      } else {
        alert("Erro ao excluir: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    <div className="container py-4">
      {/* Hero Header */}
      <section className="ascend-hero mb-5">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <span className="badge-old mb-3">
              <i className="bi bi-compass"></i> Galeria de Jornadas
            </span>
            <h1 className="display-4 mb-3 ascend-title">Suas Jornadas</h1>
            <p className="text-muted fs-5 mb-0">
              Cada jornada representa uma direção. Cada progresso, uma evidência da sua evolução pessoal.
            </p>
          </div>
          <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
            <Link href="/metas/nova" className="btn btn-ascend btn-lg">
              <i className="bi bi-plus-lg"></i> Nova Jornada
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      {metas.length > 0 ? (
        <section className="goal-gallery">
          {metas.map((meta) => {
            const cover = getCover(meta.categoria, meta.cover_image);

            return (
              <article key={meta.id} className="goal-cover-card animate-fade-in">
                <div
                  className="goal-cover-bg"
                  style={{ backgroundImage: `url('${cover}')` }}
                ></div>
                <div className="goal-cover-overlay"></div>

                <div className="goal-cover-content">
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="badge-old">{meta.categoria}</span>
                    {meta.status === "Concluída" && (
                      <span className="badge-old" style={{ borderColor: "#28a745", color: "#28a745" }}>
                        <i className="bi bi-check-circle-fill me-1"></i> Concluída
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="goal-category-label mb-2">Jornada Ascend</div>
                    <h3 className="goal-title-cover mb-3">{meta.titulo}</h3>
                    {meta.descricao && <p className="text-muted mb-3">{meta.descricao}</p>}

                    <div className="mt-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Progresso</span>
                        <strong className="gold-text">{meta.progresso ?? 0}%</strong>
                      </div>
                      <div className="progress" style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px" }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${meta.progresso ?? 0}%`,
                            background: "linear-gradient(90deg, #b89742 0%, #d8bd73 100%)",
                            borderRadius: "99px",
                          }}
                        ></div>
                      </div>
                    </div>

                    {meta.prazo && (
                      <small className="text-muted d-block mt-3" style={{ fontSize: "0.78rem" }}>
                        <i className="bi bi-calendar-event me-1"></i>
                        Prazo: {formatDate(meta.prazo)}
                      </small>
                    )}
                  </div>

                  <div className="goal-actions mt-4">
                    <Link href={`/metas/${meta.id}`} className="btn btn-ascend">
                      <i className="bi bi-folder2-open me-1"></i> Abrir Ambiente
                    </Link>

                    <Link href={`/metas/editar/${meta.id}`} className="btn btn-ascend-outline">
                      <i className="bi bi-pencil-square"></i>
                    </Link>

                    {meta.status !== "Concluída" && (
                      <button
                        onClick={() => handleConcluir(meta.id)}
                        className="btn btn-ascend-outline"
                        title="Concluir Jornada"
                      >
                        <i className="bi bi-check2-circle"></i>
                      </button>
                    )}

                    <button
                      onClick={() => handleExcluir(meta.id)}
                      className="btn btn-danger-old btn-ascend-outline"
                      style={{ color: "#ff4d4d", borderColor: "rgba(255, 77, 77, 0.2)" }}
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="ascend-card p-5 text-center">
          <i className="bi bi-compass display-1 gold-text"></i>
          <h3 className="ascend-title mt-4">Nenhuma jornada criada</h3>
          <p className="text-muted">Crie sua primeira jornada e comece sua evolução.</p>
          <Link href="/metas/nova" className="btn btn-ascend mt-3">
            <i className="bi bi-plus-lg me-1"></i> Criar Jornada
          </Link>
        </div>
      )}
    </div>
  );
}
