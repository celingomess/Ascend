"use client";

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useLevelUp } from "@/components/LevelUpContext";
import "@/styles/meta_detalhe.css";

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

interface MetaDetalheClientProps {
  goal: Goal;
  initialBlocosComItens: any[];
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

export default function MetaDetalheClient({ goal, initialBlocosComItens }: MetaDetalheClientProps) {
  const [blocos, setBlocos] = useState<any[]>(initialBlocosComItens);
  const [activeWorkspaceBlockId, setActiveWorkspaceBlockId] = useState<number | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<string>("hoje");
  const { triggerLevelUp } = useLevelUp();

  // Estados de criação rápida
  const [newAreaTitle, setNewAreaTitle] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");

  const [newMetaTitle, setNewMetaTitle] = useState("");
  const [newMetaSubtasks, setNewMetaSubtasks] = useState(""); // texto separado por linha

  const [newTrilhaTitle, setNewTrilhaTitle] = useState("");
  const [newTrilhaSteps, setNewTrilhaSteps] = useState(""); // texto separado por linha

  const [newRecursoTitle, setNewRecursoTitle] = useState("");
  const [newRecursoLink, setNewRecursoLink] = useState("");

  // Calcular próxima ação
  const getProximaAcao = () => {
    for (const grupo of blocos) {
      for (const item of grupo.itens) {
        if (item.tipo === "mini_meta") {
          if (item.filhos && item.filhos.length > 0) {
            for (const filho of item.filhos) {
              if (!filho.concluido) {
                return { acao: filho.titulo, tipo: "Subtarefa", modulo: grupo.bloco.titulo };
              }
            }
          } else if (!item.concluido) {
            return { acao: item.titulo, tipo: "Meta Inteligente", modulo: grupo.bloco.titulo };
          }
        }
      }
      for (const p of grupo.progressos) {
        for (const e of p.etapas) {
          if (!e.concluido) {
            return { acao: e.titulo, tipo: "Trilha", modulo: grupo.bloco.titulo };
          }
        }
      }
    }
    return null;
  };

  const proximaAcao = getProximaAcao();

  // Calcular Métricas
  const totalModulos = blocos.length;
  let totalMetasInteligentes = 0;
  let totalTrilhas = 0;
  blocos.forEach((g) => {
    g.itens.forEach((item: any) => {
      if (item.tipo === "mini_meta") totalMetasInteligentes++;
    });
    totalTrilhas += g.progressos.length;
  });

  // Criar Bloco (Área)
  const handleCriarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaTitle.trim()) return;

    try {
      const res = await fetch(`/metas/api/blocos/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_id: goal.id,
          titulo: newAreaTitle,
          descricao: newAreaDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBlocos([...blocos, { bloco: data.bloco, itens: [], progressos: [], media_progresso: 0 }]);
        setNewAreaTitle("");
        setNewAreaDesc("");
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Bloco (Área)
  const handleExcluirArea = async (id: number) => {
    if (!confirm("Excluir esta área e todos os seus itens? Esta ação é irreversível.")) return;

    try {
      const res = await fetch(`/metas/api/blocos/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setBlocos(blocos.filter((b) => b.bloco.id !== id));
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Checkbox (Item/Subtarefa/Etapa)
  const handleToggleItem = async (tipo: "item" | "etapa", id: number) => {
    try {
      const res = await fetch(`/metas/api/items/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.nivel_subiu) {
          triggerLevelUp(data.usuario_nivel - 1, data.usuario_nivel);
        } else {
          // Tocar efeito sonoro de sucesso se concluiu
          if (data.concluido && typeof window !== "undefined" && (window as any).AscendSFX) {
            (window as any).AscendSFX.playSuccess();
          }

          // Atualizar o estado local dos blocos para reatividade imediata
          const updatedBlocos = blocos.map((grupo) => {
            let updatedItens = grupo.itens;
            let updatedProgressos = grupo.progressos;

            if (tipo === "item") {
              updatedItens = grupo.itens.map((item: any) => {
                if (item.id === id) {
                  return { ...item, concluido: data.concluido };
                }
                if (item.filhos && item.filhos.length > 0) {
                  const updatedFilhos = item.filhos.map((f: any) => {
                    if (f.id === id) return { ...f, concluido: data.concluido };
                    return f;
                  });
                  return { ...item, filhos: updatedFilhos };
                }
                return item;
              });
            } else if (tipo === "etapa") {
              updatedProgressos = grupo.progressos.map((p: any) => {
                const updatedEtapas = p.etapas.map((e: any) => {
                  if (e.id === id) return { ...e, concluido: data.concluido };
                  return e;
                });
                return { ...p, etapas: updatedEtapas };
              });
            }

            // Recalcular média do bloco
            let total = 0;
            let check = 0;
            updatedItens.forEach((i: any) => {
              if (i.tipo === "mini_meta") {
                if (i.filhos && i.filhos.length > 0) {
                  i.filhos.forEach((f: any) => {
                    total++;
                    if (f.concluido) check++;
                  });
                } else {
                  total++;
                  if (i.concluido) check++;
                }
              }
            });
            updatedProgressos.forEach((p: any) => {
              p.etapas.forEach((e: any) => {
                total++;
                if (e.concluido) check++;
              });
            });

            return {
              ...grupo,
              itens: updatedItens,
              progressos: updatedProgressos,
              media_progresso: total > 0 ? Math.round((check / total) * 100) : 0,
            };
          });

          setBlocos(updatedBlocos);

          // Atualizar o progresso geral da jornada se retornado
          if (data.novo_progresso_geral !== undefined) {
            goal.progresso = data.novo_progresso_geral;
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Criar Item (Meta / Recurso)
  const handleCriarItem = async (e: React.FormEvent, blockId: number, tipoItem: "mini_meta" | "recurso") => {
    e.preventDefault();
    const titulo = tipoItem === "mini_meta" ? newMetaTitle : newRecursoTitle;
    if (!titulo.trim()) return;

    try {
      const res = await fetch(`/metas/api/items/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_id: blockId,
          tipo: tipoItem,
          titulo: titulo,
          conteudo: tipoItem === "recurso" ? newRecursoLink : null,
          subtarefas: tipoItem === "mini_meta" ? newMetaSubtasks : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Atualizar lista local
        const updatedBlocos = blocos.map((g) => {
          if (g.bloco.id === blockId) {
            const newItem = {
              ...data.item,
              filhos: data.subtarefas || [],
            };
            return {
              ...g,
              itens: [...g.itens, newItem],
            };
          }
          return g;
        });
        setBlocos(updatedBlocos);

        // Limpar inputs
        setNewMetaTitle("");
        setNewMetaSubtasks("");
        setNewRecursoTitle("");
        setNewRecursoLink("");
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Item
  const handleExcluirItem = async (blockId: number, itemId: number) => {
    if (!confirm("Excluir este item?")) return;

    try {
      const res = await fetch(`/metas/api/items/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedBlocos = blocos.map((g) => {
          if (g.bloco.id === blockId) {
            return {
              ...g,
              itens: g.itens.filter((i: any) => i.id !== itemId),
            };
          }
          return g;
        });
        setBlocos(updatedBlocos);
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Criar Trilha
  const handleCriarTrilha = async (e: React.FormEvent, blockId: number) => {
    e.preventDefault();
    if (!newTrilhaTitle.trim()) return;

    try {
      const res = await fetch(`/metas/api/trilhas/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_id: blockId,
          titulo: newTrilhaTitle,
          etapas: newTrilhaSteps,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedBlocos = blocos.map((g) => {
          if (g.bloco.id === blockId) {
            return {
              ...g,
              progressos: [...g.progressos, data.trilha],
            };
          }
          return g;
        });
        setBlocos(updatedBlocos);
        setNewTrilhaTitle("");
        setNewTrilhaSteps("");
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Trilha
  const handleExcluirTrilha = async (blockId: number, trilhaId: number) => {
    if (!confirm("Excluir esta trilha e todas as suas etapas?")) return;

    try {
      const res = await fetch(`/metas/api/trilhas/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trilhaId }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedBlocos = blocos.map((g) => {
          if (g.bloco.id === blockId) {
            return {
              ...g,
              progressos: g.progressos.filter((p: any) => p.id !== trilhaId),
            };
          }
          return g;
        });
        setBlocos(updatedBlocos);
      } else {
        alert("Erro: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Obter bloco ativo
  const activeBlock = blocos.find((g) => g.bloco.id === activeWorkspaceBlockId);

  return (
    <div className="container-fluid py-4 px-lg-5">
      {/* V2 Hero Banner */}
      <section className="goal-v2-hero mb-4">
        <div
          className="goal-v2-bg"
          style={{ backgroundImage: `url('${getCover(goal.categoria, goal.cover_image)}')` }}
        ></div>
        <div className="goal-v2-overlay"></div>

        <div className="goal-v2-content">
          <div className="goal-v2-topbar">
            <div className="d-flex flex-wrap gap-2">
              <span className="badge-old">
                <i className="bi bi-compass me-1"></i> Jornada
              </span>
              <span className="badge-old">
                <i className="bi bi-tag me-1"></i> {goal.categoria}
              </span>
              <span className="badge-old">
                <i className="bi bi-activity me-1"></i> {goal.status}
              </span>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Link href="/metas" className="btn btn-ascend-outline">
                <i className="bi bi-arrow-left me-1"></i> Voltar
              </Link>
              <Link href={`/metas/editar/${goal.id}`} className="btn btn-ascend-outline">
                <i className="bi bi-pencil-square me-1"></i> Editar
              </Link>
            </div>
          </div>

          <div className="goal-v2-identity">
            <div>
              <p className="goal-v2-kicker">Ambiente de evolução</p>
              <h1 className="goal-v2-title">{goal.titulo}</h1>
              {goal.descricao && <p className="goal-v2-description">{goal.descricao}</p>}
            </div>

            <div className="goal-v2-progress-orb">
              <strong>{goal.progresso ?? 0}%</strong>
              <span>Evolução</span>
            </div>
          </div>

          <div className="goal-v2-progress-line">
            <div className="d-flex justify-content-between mb-2 small text-muted">
              <span>Progresso geral da Jornada</span>
              <strong>{goal.progresso ?? 0}%</strong>
            </div>
            <div className="progress" style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px" }}>
              <div
                className="progress-bar"
                style={{
                  width: `${goal.progresso ?? 0}%`,
                  background: "linear-gradient(90deg, #b89742 0%, #d8bd73 100%)",
                  borderRadius: "99px",
                }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Grid & Indicators */}
      <section className="goal-focus-grid mb-5">
        <article className="goal-focus-card goal-focus-primary">
          <span className="badge-old mb-3">
            <i className="bi bi-arrow-right-circle me-1"></i> Próxima ação
          </span>
          {proximaAcao ? (
            <>
              <h2 className="goal-focus-title">{proximaAcao.acao}</h2>
              <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
                {proximaAcao.tipo} dentro de <strong>{proximaAcao.modulo}</strong>.
              </p>
              <button
                className="btn btn-ascend"
                onClick={() => {
                  const matchingBlock = blocos.find((g) => g.bloco.titulo === proximaAcao.modulo);
                  if (matchingBlock) {
                    setActiveWorkspaceBlockId(matchingBlock.bloco.id);
                    setWorkspaceTab("hoje");
                  }
                }}
              >
                <i className="bi bi-play-fill me-1"></i> Abrir módulo
              </button>
            </>
          ) : (
            <>
              <h2 className="goal-focus-title">Nenhuma ação pendente</h2>
              <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                Parabéns! Adicione mais mini-metas ou trilhas na sua jornada.
              </p>
            </>
          )}
        </article>

        <article className="goal-focus-card">
          <span>Módulos</span>
          <strong>{totalModulos}</strong>
          <small>Áreas da jornada</small>
        </article>

        <article className="goal-focus-card">
          <span>Metas</span>
          <strong>{totalMetasInteligentes}</strong>
          <small>Metas inteligentes</small>
        </article>

        <article className="goal-focus-card">
          <span>Trilhas</span>
          <strong>{totalTrilhas}</strong>
          <small>Mapas de progresso</small>
        </article>
      </section>

      {/* Area Block Creator */}
      <section className="goal-create-module p-4 mb-5">
        <div>
          <span className="badge-old mb-2">
            <i className="bi bi-plus-circle me-1"></i> Nova área
          </span>
          <h2 className="ascend-title mb-2" style={{ fontSize: "1.3rem" }}>Criar área da jornada</h2>
          <p className="text-muted mb-0 small">
            Separe sua jornada em áreas claras. Ex: Fundamentos teóricos, Projeto Final, Prática, Execução.
          </p>
        </div>

        <form onSubmit={handleCriarArea} className="goal-create-form d-flex gap-2 flex-wrap">
          <input
            type="text"
            className="form-control flex-grow-1"
            placeholder="Nome da área (ex: Estudos Básicos)"
            value={newAreaTitle}
            onChange={(e) => setNewAreaTitle(e.target.value)}
            required
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(226, 201, 133, 0.12)", color: "#fff" }}
          />
          <input
            type="text"
            className="form-control flex-grow-1"
            placeholder="Descrição curta (Opcional)"
            value={newAreaDesc}
            onChange={(e) => setNewAreaDesc(e.target.value)}
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(226, 201, 133, 0.12)", color: "#fff" }}
          />
          <button type="submit" className="btn btn-ascend">
            <i className="bi bi-plus-lg me-1"></i> Criar
          </button>
        </form>
      </section>

      {/* Areas List Grid */}
      <section className="goal-areas-section">
        <div className="goal-section-header mb-4">
          <div>
            <span className="goal-section-kicker">Áreas da Jornada</span>
            <h2 className="goal-section-title">Progresso por modulo</h2>
          </div>
        </div>

        {blocos.length > 0 ? (
          <div className="goal-areas-grid">
            {blocos.map((grupo) => {
              const numMetas = grupo.itens.filter((i: any) => i.tipo === "mini_meta").length;
              const numRecursos = grupo.itens.filter((i: any) => i.tipo === "recurso").length;
              const numTrilhas = grupo.progressos.length;

              // Encontrar próxima ação dentro deste bloco especificamente
              let localNextAction = "Nenhuma ação pendente";
              let localNextType = "";
              for (const i of grupo.itens) {
                if (i.tipo === "mini_meta") {
                  if (i.filhos && i.filhos.length > 0) {
                    const firstUnconcludedChild = i.filhos.find((f: any) => !f.concluido);
                    if (firstUnconcludedChild) {
                      localNextAction = firstUnconcludedChild.titulo;
                      localNextType = "Subtarefa";
                      break;
                    }
                  } else if (!i.concluido) {
                    localNextAction = i.titulo;
                    localNextType = "Meta Inteligente";
                    break;
                  }
                }
              }
              if (localNextType === "") {
                for (const p of grupo.progressos) {
                  const firstUnconcludedStep = p.etapas.find((e: any) => !e.concluido);
                  if (firstUnconcludedStep) {
                    localNextAction = firstUnconcludedStep.titulo;
                    localNextType = "Trilha";
                    break;
                  }
                }
              }

              return (
                <article key={grupo.bloco.id} className="goal-area-card">
                  <div>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <span className="badge-old">
                        <i className="bi bi-folder2 me-1"></i> Área
                      </span>
                      <span className="goal-area-percent">{grupo.media_progresso}%</span>
                    </div>

                    <h3 className="goal-area-title">{grupo.bloco.titulo}</h3>
                    {grupo.bloco.descricao && <p className="goal-area-desc">{grupo.bloco.descricao}</p>}

                    <div className="goal-area-progress mt-3">
                      <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${grupo.media_progresso}%`,
                            background: "var(--gold-soft)",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="goal-area-next mt-4">
                      <span>Próxima ação</span>
                      <strong>{localNextAction}</strong>
                      {localNextType && <small>{localNextType}</small>}
                    </div>
                  </div>

                  <div className="goal-area-footer mt-4 pt-3 border-top" style={{ borderColor: "rgba(255,255,255,0.05) !important" }}>
                    <div className="goal-area-metrics d-flex gap-3 text-muted small mb-3">
                      <span>
                        <i className="bi bi-bullseye me-1"></i> {numMetas} metas
                      </span>
                      <span>
                        <i className="bi bi-signpost-2 me-1"></i> {numTrilhas} trilhas
                      </span>
                      <span>
                        <i className="bi bi-journal-bookmark me-1"></i> {numRecursos} recursos
                      </span>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-ascend flex-grow-1"
                        onClick={() => {
                          setActiveWorkspaceBlockId(grupo.bloco.id);
                          setWorkspaceTab("hoje");
                        }}
                      >
                        <i className="bi bi-layout-sidebar-inset me-1"></i> Workspace
                      </button>
                      <button
                        onClick={() => handleExcluirArea(grupo.bloco.id)}
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
          </div>
        ) : (
          <div className="text-center py-5 text-muted">
            <p>Nenhuma área de evolução cadastrada para esta jornada.</p>
          </div>
        )}
      </section>

      {/* WORKSPACE SIDEBAR MODAL OVERLAY */}
      {activeWorkspaceBlockId !== null && activeBlock && (
        <div className="workspace-modal-overlay active">
          <div className="workspace-modal goal-workspace-modal animate-scale-up">
            <header className="goal-workspace-header d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
              <div>
                <span className="badge-old mb-2 d-inline-block">
                  <i className="bi bi-layout-sidebar-inset me-1"></i> Workspace da Área
                </span>
                <h2 className="ascend-title mb-1" style={{ fontSize: "1.5rem" }}>{activeBlock.bloco.titulo}</h2>
                {activeBlock.bloco.descricao && <p className="text-muted small mb-0">{activeBlock.bloco.descricao}</p>}
              </div>
              <button
                className="modal-close-btn bg-transparent border-0 text-white fs-3"
                onClick={() => setActiveWorkspaceBlockId(null)}
                style={{ cursor: "pointer", opacity: 0.7 }}
              >
                &times;
              </button>
            </header>

            <div className="goal-workspace-layout">
              {/* Workspace Navigation Tabs */}
              <aside className="goal-workspace-tabs d-flex flex-column gap-2 mb-4">
                <button
                  type="button"
                  className={`workspace-tab ${workspaceTab === "hoje" ? "active" : ""}`}
                  onClick={() => setWorkspaceTab("hoje")}
                >
                  <i className="bi bi-lightning-charge me-2"></i> Hoje
                </button>
                <button
                  type="button"
                  className={`workspace-tab ${workspaceTab === "metas" ? "active" : ""}`}
                  onClick={() => setWorkspaceTab("metas")}
                >
                  <i className="bi bi-bullseye me-2"></i> Metas Inteligentes
                </button>
                <button
                  type="button"
                  className={`workspace-tab ${workspaceTab === "trilhas" ? "active" : ""}`}
                  onClick={() => setWorkspaceTab("trilhas")}
                >
                  <i className="bi bi-signpost-2 me-2"></i> Trilhas
                </button>
                <button
                  type="button"
                  className={`workspace-tab ${workspaceTab === "recursos" ? "active" : ""}`}
                  onClick={() => setWorkspaceTab("recursos")}
                >
                  <i className="bi bi-journal-bookmark me-2"></i> Biblioteca
                </button>
              </aside>

              {/* Workspace Content Area */}
              <main className="goal-workspace-content flex-grow-1 p-3 rounded" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
                {/* TAB 1: HOJE (Today) */}
                {workspaceTab === "hoje" && (
                  <div>
                    <h4 className="gold-text mb-3" style={{ fontSize: "1.1rem" }}>Ações Recomendadas</h4>
                    <p className="text-muted small">Aqui estão as tarefas pendentes para hoje nesta área.</p>

                    <div className="d-flex flex-column gap-2 mt-3">
                      {activeBlock.itens.filter((i: any) => i.tipo === "mini_meta").length === 0 &&
                      activeBlock.progressos.length === 0 ? (
                        <p className="text-muted small text-center py-4">Nenhum item cadastrado nesta área ainda.</p>
                      ) : (
                        <>
                          {/* Listar mini-metas não concluídas */}
                          {activeBlock.itens
                            .filter((i: any) => i.tipo === "mini_meta")
                            .map((item: any) => {
                              if (item.filhos && item.filhos.length > 0) {
                                return item.filhos
                                  .filter((f: any) => !f.concluido)
                                  .map((filho: any) => (
                                    <div key={filho.id} className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                                      <input
                                        type="checkbox"
                                        checked={false}
                                        onChange={() => handleToggleItem("item", filho.id)}
                                        style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--gold-soft)" }}
                                      />
                                      <div>
                                        <span className="fw-semibold text-white">{filho.titulo}</span>
                                        <small className="d-block text-muted" style={{ fontSize: "0.72rem" }}>Subtarefa de: {item.titulo}</small>
                                      </div>
                                    </div>
                                  ));
                              } else if (!item.concluido) {
                                return (
                                  <div key={item.id} className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      onChange={() => handleToggleItem("item", item.id)}
                                      style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--gold-soft)" }}
                                    />
                                    <div>
                                      <span className="fw-semibold text-white">{item.titulo}</span>
                                      <small className="d-block text-muted" style={{ fontSize: "0.72rem" }}>Meta Independente</small>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}

                          {/* Listar etapas de trilhas não concluídas */}
                          {activeBlock.progressos.map((trilha: any) => {
                            const nextStep = trilha.etapas.find((e: any) => !e.concluido);
                            if (nextStep) {
                              return (
                                <div key={nextStep.id} className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={() => handleToggleItem("etapa", nextStep.id)}
                                    style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--gold-soft)" }}
                                  />
                                  <div>
                                    <span className="fw-semibold text-white">{nextStep.titulo}</span>
                                    <small className="d-block text-muted" style={{ fontSize: "0.72rem" }}>Etapa da Trilha: {trilha.titulo}</small>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: METAS INTELIGENTES */}
                {workspaceTab === "metas" && (
                  <div>
                    <h4 className="gold-text mb-3" style={{ fontSize: "1.1rem" }}>Suas Metas e Checklists</h4>

                    {/* Criador de Meta */}
                    <form onSubmit={(e) => handleCriarItem(e, activeBlock.bloco.id, "mini_meta")} className="mb-4 p-3 rounded" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="mb-2">
                        <label className="text-muted small mb-1">Título da Meta</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Ler capítulo 1"
                          value={newMetaTitle}
                          onChange={(e) => setNewMetaTitle(e.target.value)}
                          required
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="text-muted small mb-1">Subtarefas (Uma por linha, Opcional)</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Ex:&#10;Subtarefa A&#10;Subtarefa B"
                          value={newMetaSubtasks}
                          onChange={(e) => setNewMetaSubtasks(e.target.value)}
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        ></textarea>
                      </div>
                      <button type="submit" className="btn btn-xs btn-ascend">
                        + Criar Meta Inteligente
                      </button>
                    </form>

                    {/* Lista de Metas */}
                    <div className="d-flex flex-column gap-3">
                      {activeBlock.itens.filter((i: any) => i.tipo === "mini_meta").length === 0 ? (
                        <p className="text-muted small text-center">Nenhuma meta cadastrada.</p>
                      ) : (
                        activeBlock.itens
                          .filter((i: any) => i.tipo === "mini_meta")
                          .map((item: any) => (
                            <div key={item.id} className="p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  {(!item.filhos || item.filhos.length === 0) && (
                                    <input
                                      type="checkbox"
                                      checked={item.concluido || false}
                                      onChange={() => handleToggleItem("item", item.id)}
                                      style={{ accentColor: "var(--gold-soft)", cursor: "pointer" }}
                                    />
                                  )}
                                  <strong className={item.concluido ? "text-decoration-line-through text-muted" : "text-white"}>
                                    {item.titulo}
                                  </strong>
                                </div>
                                <button
                                  onClick={() => handleExcluirItem(activeBlock.bloco.id, item.id)}
                                  className="btn bg-transparent border-0 p-0 text-danger"
                                  style={{ opacity: 0.6 }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>

                              {/* Subtarefas */}
                              {item.filhos && item.filhos.length > 0 && (
                                <div className="ms-4 mt-2 d-flex flex-column gap-1">
                                  {item.filhos.map((filho: any) => (
                                    <div key={filho.id} className="d-flex align-items-center gap-2 py-1">
                                      <input
                                        type="checkbox"
                                        checked={filho.concluido || false}
                                        onChange={() => handleToggleItem("item", filho.id)}
                                        style={{ accentColor: "var(--gold-soft)", cursor: "pointer" }}
                                      />
                                      <span className={filho.concluido ? "text-decoration-line-through text-muted small" : "text-muted small"}>
                                        {filho.titulo}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: TRILHAS (Trails) */}
                {workspaceTab === "trilhas" && (
                  <div>
                    <h4 className="gold-text mb-3" style={{ fontSize: "1.1rem" }}>Trilhas de Desenvolvimento</h4>

                    {/* Criar Trilha */}
                    <form onSubmit={(e) => handleCriarTrilha(e, activeBlock.bloco.id)} className="mb-4 p-3 rounded" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="mb-2">
                        <label className="text-muted small mb-1">Nome da Trilha</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Jornada de Aprendizado"
                          value={newTrilhaTitle}
                          onChange={(e) => setNewTrilhaTitle(e.target.value)}
                          required
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="text-muted small mb-1">Etapas Sequenciais (Uma por linha, requerida)</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Ex:&#10;Instalar ferramentas&#10;Criar Hello World&#10;Deploy final"
                          value={newTrilhaSteps}
                          onChange={(e) => setNewTrilhaSteps(e.target.value)}
                          required
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        ></textarea>
                      </div>
                      <button type="submit" className="btn btn-xs btn-ascend">
                        + Criar Trilha Sequencial
                      </button>
                    </form>

                    {/* Lista de Trilhas */}
                    <div className="d-flex flex-column gap-3">
                      {activeBlock.progressos.length === 0 ? (
                        <p className="text-muted small text-center">Nenhuma trilha cadastrada.</p>
                      ) : (
                        activeBlock.progressos.map((trilha: any) => {
                          const totalSteps = trilha.etapas.length;
                          const completedSteps = trilha.etapas.filter((e: any) => e.concluido).length;
                          const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                          return (
                            <div key={trilha.id} className="p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong className="text-white">{trilha.titulo} ({percent}%)</strong>
                                <button
                                  onClick={() => handleExcluirTrilha(activeBlock.bloco.id, trilha.id)}
                                  className="btn bg-transparent border-0 p-0 text-danger"
                                  style={{ opacity: 0.6 }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>

                              <div className="progress mb-3" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
                                <div
                                  className="progress-bar"
                                  style={{ width: `${percent}%`, background: "var(--gold)" }}
                                ></div>
                              </div>

                              {/* Lista de Etapas */}
                              <div className="d-flex flex-column gap-2">
                                {trilha.etapas.map((etapa: any) => (
                                  <div key={etapa.id} className="d-flex align-items-center gap-2 py-1">
                                    <input
                                      type="checkbox"
                                      checked={etapa.concluido || false}
                                      onChange={() => handleToggleItem("etapa", etapa.id)}
                                      style={{ accentColor: "var(--gold-soft)", cursor: "pointer" }}
                                    />
                                    <span className={etapa.concluido ? "text-decoration-line-through text-muted small" : "text-muted small"}>
                                      {etapa.titulo}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: BIBLIOTECA (Library) */}
                {workspaceTab === "recursos" && (
                  <div>
                    <h4 className="gold-text mb-3" style={{ fontSize: "1.1rem" }}>Biblioteca & Recursos</h4>

                    {/* Criar Recurso */}
                    <form onSubmit={(e) => handleCriarItem(e, activeBlock.bloco.id, "recurso")} className="mb-4 p-3 rounded" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="mb-2">
                        <label className="text-muted small mb-1">Título do Recurso / Link</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: Artigo de Referência"
                          value={newRecursoTitle}
                          onChange={(e) => setNewRecursoTitle(e.target.value)}
                          required
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="text-muted small mb-1">URL / Nota Explicativa (Opcional)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ex: https://google.com"
                          value={newRecursoLink}
                          onChange={(e) => setNewRecursoLink(e.target.value)}
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                        />
                      </div>
                      <button type="submit" className="btn btn-xs btn-ascend">
                        + Adicionar Recurso
                      </button>
                    </form>

                    {/* Lista de Recursos */}
                    <div className="d-flex flex-column gap-2">
                      {activeBlock.itens.filter((i: any) => i.tipo === "recurso").length === 0 ? (
                        <p className="text-muted small text-center">Nenhum recurso anexado.</p>
                      ) : (
                        activeBlock.itens
                          .filter((i: any) => i.tipo === "recurso")
                          .map((item: any) => (
                            <div key={item.id} className="d-flex justify-content-between align-items-center p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-journal-bookmark gold-text"></i>
                                <div>
                                  {item.conteudo && item.conteudo.startsWith("http") ? (
                                    <Link href={item.conteudo} target="_blank" className="text-white text-decoration-none fw-semibold gold-text">
                                      {item.titulo} <i className="bi bi-box-arrow-up-right small"></i>
                                    </Link>
                                  ) : (
                                    <span className="text-white fw-semibold">{item.titulo}</span>
                                  )}
                                  {item.conteudo && !item.conteudo.startsWith("http") && (
                                    <p className="text-muted mb-0 small" style={{ fontSize: "0.75rem" }}>{item.conteudo}</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleExcluirItem(activeBlock.bloco.id, item.id)}
                                className="btn bg-transparent border-0 p-0 text-danger"
                                style={{ opacity: 0.6 }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
