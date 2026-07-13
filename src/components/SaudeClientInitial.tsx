"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useLevelUp } from "./LevelUpContext";
import Chart from "chart.js/auto";
import { parseExpressMealAction } from "@/app/saude/actions";

import "@/styles/health.css";

interface Exercise {
  id: number;
  workout_id: number | null;
  nome_exercicio: string | null;
  series: number | null;
  repeticoes: string | null;
  carga_atual: number | null;
  ordem: number | null;
}

interface Workout {
  id: number;
  user_id: number | null;
  nome: string | null;
  dias_semana: string | null; // Comma-separated (e.g. "Seg,Qua,Sex")
  conteudo: string | null;    // Para Cardio/Luta/Corrida
  criado_em: Date | null;
  exercises: Exercise[];
}

interface Nutrition {
  id: number;
  user_id: number | null;
  data: Date | null;
  calorias_consumidas: number | null;
  calorias_meta: number | null;
  proteina: number | null;
  carboidrato: number | null;
  gordura: number | null;
  agua_ml: number | null;
}

interface SaudeClientInitialProps {
  user: {
    nome: string;
    nivel: number;
    xp_total: number;
    peso?: number | null;
  };
  initialNutrition: Nutrition;
  workouts: Workout[];
  workoutLogs: any[];
}

const dbDiasAbrev = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dbDiasNomesCompletos: { [key: string]: string } = {
  Dom: "Domingo",
  Seg: "Segunda-feira",
  Ter: "Terça-feira",
  Qua: "Quarta-feira",
  Qui: "Quinta-feira",
  Sex: "Sexta-feira",
  Sáb: "Sábado",
};

export const SaudeClientInitial: React.FC<SaudeClientInitialProps> = ({
  user,
  initialNutrition,
  workouts,
  workoutLogs,
}) => {
  const [nutrition, setNutrition] = useState<Nutrition>(initialNutrition);
  const [agua, setAgua] = useState<number>(initialNutrition.agua_ml || 0);
  const [workoutsList, setWorkoutsList] = useState<Workout[]>(workouts);

  const { triggerLevelUp } = useLevelUp();

  const [peso, setPeso] = useState<number | null>(user.peso || null);
  const waterGoal = peso ? Math.round(peso * 35) : 2000;

  // Estados do Gráfico de Cargas
  const [historyModalExercise, setHistoryModalExercise] = useState<Exercise | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyChartRef = useRef<Chart | null>(null);

  // Solicitar permissão de Notificação e configurar lembrete de PWA
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const interval = setInterval(() => {
        if (Notification.permission === "granted") {
          new Notification("💧 Hora de se Hidratar! - Ascend", {
            body: `Mantenha seu foco! Lembre-se de beber um copo d'água. Sua meta é de ${waterGoal}ml hoje.`,
            icon: "/icons/icon-192x192.png"
          });
        }
      }, 1000 * 60 * 60 * 2); // A cada 2 horas
      return () => clearInterval(interval);
    }
  }, [waterGoal]);

  // Efeito para desenhar o gráfico de evolução de cargas
  useEffect(() => {
    if (!historyModalExercise || !chartCanvasRef.current) return;

    let active = true;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/saude/exercicio/${historyModalExercise.id}/historico`);
        const data = await res.json();
        if (data.success && active) {
          const ctx = chartCanvasRef.current?.getContext("2d");
          if (!ctx) return;

          if (historyChartRef.current) {
            historyChartRef.current.destroy();
          }

          const logs = data.history || [];
          const labels = logs.map((h: any) => h.data);
          const values = logs.map((h: any) => h.carga);

          historyChartRef.current = new Chart(ctx, {
            type: "line",
            data: {
              labels: labels.length > 0 ? labels : ["Sem dados"],
              datasets: [
                {
                  label: "Carga (kg)",
                  data: values.length > 0 ? values : [historyModalExercise.carga_atual || 0],
                  borderColor: "#c7a35a",
                  backgroundColor: "rgba(199, 163, 90, 0.1)",
                  borderWidth: 2,
                  tension: 0.3,
                  fill: true,
                  pointBackgroundColor: "#c7a35a",
                  pointRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  grid: {
                    color: "rgba(255,255,255,0.05)",
                  },
                  ticks: {
                    color: "#d9cbb2",
                  },
                },
                x: {
                  grid: {
                    color: "rgba(255,255,255,0.05)",
                  },
                  ticks: {
                    color: "#d9cbb2",
                  },
                },
              },
            },
          });
        }
      } catch (err) {
        console.error("Erro ao carregar histórico: ", err);
      }
    };

    fetchHistory();

    return () => {
      active = false;
      if (historyChartRef.current) {
        historyChartRef.current.destroy();
        historyChartRef.current = null;
      }
    };
  }, [historyModalExercise]);

  const handleUpdateWeight = async (newPeso: number) => {
    const formData = new FormData();
    formData.append("peso", newPeso.toString());

    try {
      const res = await fetch("/saude/peso/atualizar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPeso(newPeso);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("💧 Nova Meta Hidratação!", {
            body: `Seu peso foi atualizado para ${newPeso}kg. Sua nova meta é de ${Math.round(newPeso * 35)}ml d'água por dia.`,
            icon: "/icons/icon-192x192.png"
          });
        }
      } else {
        alert("Erro ao atualizar peso: " + data.message);
      }
    } catch (err: any) {
      alert("Erro de conexão: " + err.message);
    }
  };

  const openHistoryChart = (exercise: Exercise) => {
    setHistoryModalExercise(exercise);
  };

  // Dia ativo selecionado na agenda semanal (padrão = hoje)
  const currentDayIndex = new Date().getDay();
  const [selectedDayTab, setSelectedDayTab] = useState<string>(dbDiasAbrev[currentDayIndex]);

  // Estados de Controle dos Modais
  const [isNovoTreinoOpen, setIsNovoTreinoOpen] = useState(false);
  const [isConfigMetaOpen, setIsConfigMetaOpen] = useState(false);
  const [activeExerciseWorkoutId, setActiveExerciseWorkoutId] = useState<number | null>(null);

  // Estados de criação de novo treino
  const [newWorkoutType, setNewWorkoutType] = useState<"musculacao" | "cardio">("musculacao");
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutDays, setNewWorkoutDays] = useState<string[]>([]);
  const [newWorkoutContent, setNewWorkoutContent] = useState("");
  const [newWorkoutBatchExercises, setNewWorkoutBatchExercises] = useState("");

  // Controle de abas internas no modal de Adicionar Exercício individual
  const [exerciseModalTab, setExerciseModalTab] = useState<"individual" | "batch">("individual");
  const [batchText, setBatchText] = useState("");

  // Estados controlados para macros e Express IA
  const [caloriesInput, setCaloriesInput] = useState("");
  const [proteinInput, setProteinInput] = useState("");
  const [carbsInput, setCarbsInput] = useState("");
  const [fatInput, setFatInput] = useState("");
  const [expressInput, setExpressInput] = useState("");
  const [isExpressLoading, setIsExpressLoading] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);

  // Parser inteligente de linhas de treino
  const parseExerciseLine = (line: string) => {
    line = line.trim();
    if (!line) return null;

    const matchSpecs = line.match(/(\d+)\s*[xX]\s*([\d\-\–\s\w]+)/);

    let series = 4;
    let repeticoes = "8-12";
    let nome = line;
    let carga = 0;

    if (matchSpecs) {
      series = parseInt(matchSpecs[1], 10);
      repeticoes = matchSpecs[2].trim();

      const specsIndex = line.indexOf(matchSpecs[0]);
      nome = line.slice(0, specsIndex).trim();

      let remainder = line.slice(specsIndex + matchSpecs[0].length).trim();
      remainder = remainder.replace(/com|kg|kgs|de/gi, "").trim();
      const matchCarga = remainder.match(/[\d\.]+/);
      if (matchCarga) {
        carga = parseFloat(matchCarga[0]);
      }
    } else {
      const matchCargaOnly = line.match(/(\d+)\s*kg/i);
      if (matchCargaOnly) {
        carga = parseFloat(matchCargaOnly[1]);
        nome = line.replace(matchCargaOnly[0], "").trim();
      }
    }

    nome = nome.replace(/^[\s\-\–\—\•\*]+/gi, "").trim();
    if (!nome) nome = line;

    return {
      nome_exercicio: nome,
      series,
      repeticoes,
      carga,
    };
  };

  // Toggle dia da semana na criação
  const toggleNewWorkoutDay = (day: string) => {
    setNewWorkoutDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Form Lançar Refeição Rápida
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/saude/nutricao/adicionar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setNutrition((prev) => ({
          ...prev,
          calorias_consumidas: data.calorias_consumidas,
          calorias_meta: data.calorias_meta,
          proteina: data.proteina,
          carboidrato: data.carboidrato,
          gordura: data.gordura,
          agua_ml: data.agua_ml,
        }));
        setAgua(data.agua_ml);

        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          (window as any).AscendSFX.playClick();
        }

        if (data.meta_atingida) {
          if (typeof window !== "undefined" && (window as any).AscendSFX) {
            (window as any).AscendSFX.playSuccess();
          }
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
        setCaloriesInput("");
        setProteinInput("");
        setCarbsInput("");
        setFatInput("");
        setExpressInput("");
        form.reset();
      } else {
        alert("Erro ao salvar: " + data.message);
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  // Express com IA para refeições
  const handleExpressMealParse = async () => {
    if (!expressInput.trim()) {
      setExpressError("Por favor, descreva o que comeu.");
      return;
    }
    setIsExpressLoading(true);
    setExpressError(null);
    try {
      const res = await parseExpressMealAction(expressInput);
      if (res.success) {
        setCaloriesInput(res.calorias ? res.calorias.toString() : "0");
        setProteinInput(res.proteina ? res.proteina.toString() : "0");
        setCarbsInput(res.carboidrato ? res.carboidrato.toString() : "0");
        setFatInput(res.gordura ? res.gordura.toString() : "0");
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          (window as any).AscendSFX.playClick();
        }
      } else {
        setExpressError("IA falhou: " + res.message);
      }
    } catch (err: any) {
      setExpressError("Erro de rede: " + err.message);
    } finally {
      setIsExpressLoading(false);
    }
  };

  // Alterar meta calórica
  const handleUpdateMeta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/saude/meta/atualizar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setNutrition((prev) => ({
          ...prev,
          calorias_meta: data.calorias_meta,
          calorias_consumidas: data.calorias_consumidas,
        }));
        setIsConfigMetaOpen(false);
      }
    } catch (err) {}
  };

  // Adicionar Água
  const handleAddWater = async (ml: number) => {
    if (typeof window !== "undefined" && (window as any).AscendSFX) {
      (window as any).AscendSFX.playClick();
    }

    const formData = new FormData();
    formData.append("agua", ml.toString());

    try {
      const res = await fetch("/saude/nutricao/adicionar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setNutrition((prev) => ({
          ...prev,
          agua_ml: data.agua_ml,
        }));
        setAgua(data.agua_ml);
      }
    } catch (err) {}
  };

  // Salvar Carga
  const handleSaveCarga = async (exerciseId: number, value: string) => {
    const formData = new FormData();
    formData.append("carga", value);

    try {
      const res = await fetch(`/saude/exercicio/${exerciseId}/carga`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          (window as any).AscendSFX.playClick();
        }
      }
    } catch (err) {}
  };

  // Concluir Treino
  const handleConcluirTreino = async (workoutId: number) => {
    try {
      const res = await fetch(`/saude/treino/${workoutId}/concluir`, {
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
            spread: 80,
            origin: { y: 0.6 },
          });
          alert(`${data.mensagem} (+${data.xp_ganho} XP!)`);
          window.location.reload();
        }
      } else {
        alert("Erro ao concluir treino: " + data.message);
      }
    } catch (err) {}
  };

  // Criar Treino
  const handleCreateWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newWorkoutName) {
      alert("Defina o nome da sua rotina.");
      return;
    }

    try {
      const res = await fetch("/saude/treino/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: newWorkoutName,
          dias_semana: newWorkoutDays,
          tipo: newWorkoutType,
          conteudo: newWorkoutContent,
          exercicios_batch: newWorkoutBatchExercises,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setWorkoutsList((prev) => [...prev, data.workout]);
        setIsNovoTreinoOpen(false);

        // Resetar form
        setNewWorkoutName("");
        setNewWorkoutDays([]);
        setNewWorkoutContent("");
        setNewWorkoutBatchExercises("");
      } else {
        alert("Erro ao criar treino: " + data.message);
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  // Deletar Treino
  const handleDeleteWorkout = async (e: React.FormEvent<HTMLFormElement>, workoutId: number) => {
    e.preventDefault();
    if (!confirm("Deseja realmente excluir esta rotina de treino?")) return;

    try {
      const res = await fetch(`/saude/treino/deletar/${workoutId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setWorkoutsList((prev) => prev.filter((w) => w.id !== workoutId));
      }
    } catch (err) {}
  };

  // Criar Exercício Individual
  const handleCreateExercise = async (e: React.FormEvent<HTMLFormElement>, workoutId: number) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch(`/saude/treino/${workoutId}/exercicio/criar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setWorkoutsList((prev) =>
          prev.map((w) => {
            if (w.id === workoutId) {
              return {
                ...w,
                exercises: [...w.exercises, data.exercise],
              };
            }
            return w;
          })
        );
        setActiveExerciseWorkoutId(null);
        form.reset();
      } else {
        alert("Erro ao salvar exercício: " + data.message);
      }
    } catch (err) {}
  };

  // Importar múltiplos exercícios em Lote
  const handleBatchImport = async (e: React.FormEvent<HTMLFormElement>, workoutId: number) => {
    e.preventDefault();

    const lines = batchText.split("\n");
    const parsedExercises = lines
      .map(parseExerciseLine)
      .filter((ex) => ex !== null && ex.nome_exercicio);

    if (parsedExercises.length === 0) {
      alert("Nenhum exercício válido detectado na lista.");
      return;
    }

    try {
      const res = await fetch(`/saude/treino/${workoutId}/exercicio/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises: parsedExercises }),
      });
      const data = await res.json();

      if (data.success) {
        setWorkoutsList((prev) =>
          prev.map((w) => {
            if (w.id === workoutId) {
              return {
                ...w,
                exercises: data.exercises,
              };
            }
            return w;
          })
        );
        setBatchText("");
        setActiveExerciseWorkoutId(null);
      } else {
        alert("Erro ao importar: " + data.message);
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  // Deletar Exercício
  const handleDeleteExercise = async (e: React.FormEvent<HTMLFormElement>, workoutId: number, exerciseId: number) => {
    e.preventDefault();
    if (!confirm("Deseja excluir este exercício?")) return;

    try {
      const res = await fetch(`/saude/exercicio/deletar/${exerciseId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setWorkoutsList((prev) =>
          prev.map((w) => {
            if (w.id === workoutId) {
              return {
                ...w,
                exercises: w.exercises.filter((ex) => ex.id !== exerciseId),
              };
            }
            return w;
          })
        );
      }
    } catch (err) {}
  };

  // Filtragem de treinos pelo dia da semana selecionado nas abas
  const activeWorkouts = workoutsList.filter((workout) => {
    if (selectedDayTab === "Todos") return true;
    const dias = (workout.dias_semana || "").split(",");
    return dias.includes(selectedDayTab);
  });

  // Auxiliares do Anel de Progresso
  const caloriasConsumidas = nutrition.calorias_consumidas ?? 0;
  const caloriasMeta = nutrition.calorias_meta ?? 2000;
  const porcentagemCalorias = Math.min(caloriasConsumidas / caloriasMeta, 1);
  const strokeOffset = 471.2 - 471.2 * porcentagemCalorias;

  return (
    <div className="container-fluid py-4">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge-old mb-2">
            <i className="bi bi-heart-pulse-fill"></i> Performance Física
          </span>
          <h2 className="ascend-title mb-0">Saúde & Nutrição</h2>
        </div>
        <div className="d-flex gap-2">
          <Link
            href="/saude/evolucao"
            className="btn btn-outline-secondary border-secondary text-white d-flex align-items-center gap-2"
          >
            <i className="bi bi-graph-up"></i> Evolução & IA
          </Link>
          <button
            type="button"
            className="btn btn-ascend"
            onClick={() => setIsNovoTreinoOpen(true)}
          >
            <i className="bi bi-plus-lg"></i> Novo Treino
          </button>
        </div>
      </div>

      {/* Layout Dividido */}
      <div className="row g-4 fade-in-up">
        {/* Painel de Nutrição & Hidratação (Esquerda) */}
        <div className="col-lg-5 col-md-12">
          <div className="ascend-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="ascend-title mb-0" style={{ fontSize: "1.3rem" }}>
                Foco Nutricional
              </h3>
              <button
                className="btn btn-sm btn-ascend-outline"
                onClick={() => setIsConfigMetaOpen(true)}
              >
                <i className="bi bi-gear"></i> Meta
              </button>
            </div>

            {/* Anéis SVG de Calorias */}
            <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap mb-4">
              <div
                className="position-relative d-flex align-items-center justify-content-center"
                style={{ width: "180px", height: "180px" }}
              >
                <svg className="calorie-ring-svg" width="180" height="180" viewBox="0 0 180 180">
                  <circle className="ring-bg" cx="90" cy="90" r="75" />
                  <circle
                    className="ring-active"
                    cx="90"
                    cy="90"
                    r="75"
                    style={{
                      strokeDasharray: "471.2",
                      strokeDashoffset: strokeOffset,
                    }}
                  />
                </svg>
                <div
                  className="text-center position-absolute"
                  style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                >
                  <span
                    className="d-block text-muted small"
                    style={{ fontSize: "0.65rem", letterSpacing: "1px" }}
                  >
                    CONSUMIDO
                  </span>
                  <strong className="d-block fs-3 gold-text" id="lbl-calorias-consumidas">
                    {caloriasConsumidas}
                  </strong>
                  <span className="d-block text-muted small" style={{ fontSize: "0.65rem" }}>
                    de <span id="lbl-calorias-meta">{caloriasMeta}</span> kcal
                  </span>
                </div>
              </div>

              {/* Progresso dos Macros */}
              <div className="flex-grow-1" style={{ minWidth: "160px" }}>
                {/* Proteína */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot macro-p"></span> Proteínas
                    </span>
                    <strong>
                      <span id="lbl-macro-p">{nutrition.proteina ?? 0}</span>g
                    </strong>
                  </div>
                  <div
                    className="progress"
                    style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px" }}
                  >
                    <div
                      className="progress-bar bg-primary"
                      id="bar-macro-p"
                      style={{
                        width: `${(((nutrition.proteina ?? 0) * 4) / caloriasMeta) * 100}%`,
                        borderRadius: "99px",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Carboidrato */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot macro-c"></span> Carboidratos
                    </span>
                    <strong>
                      <span id="lbl-macro-c">{nutrition.carboidrato ?? 0}</span>g
                    </strong>
                  </div>
                  <div
                    className="progress"
                    style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px" }}
                  >
                    <div
                      className="progress-bar bg-success"
                      id="bar-macro-c"
                      style={{
                        width: `${(((nutrition.carboidrato ?? 0) * 4) / caloriasMeta) * 100}%`,
                        borderRadius: "99px",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Gordura */}
                <div>
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot macro-f"></span> Gorduras
                    </span>
                    <strong>
                      <span id="lbl-macro-f">{nutrition.gordura ?? 0}</span>g
                    </strong>
                  </div>
                  <div
                    className="progress"
                    style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "99px" }}
                  >
                    <div
                      className="progress-bar bg-warning"
                      id="bar-macro-f"
                      style={{
                        width: `${(((nutrition.gordura ?? 0) * 9) / caloriasMeta) * 100}%`,
                        borderRadius: "99px",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário Rápido de Macros */}
            <form
              id="form-add-nutrition"
              onSubmit={handleQuickAdd}
              className="row g-2 mb-4 p-3 rounded"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(226,201,133,0.1)" }}
            >
              <div className="col-12 mb-1 d-flex align-items-center justify-content-between">
                <span
                  className="text-muted small"
                  style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}
                >
                  Lançar refeição rápida
                </span>
                <span className="text-warning small" style={{ fontSize: "0.68rem" }}>
                  <i className="bi bi-sparkles"></i> Express com IA
                </span>
              </div>
              
              <div className="col-12 mb-2">
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control border-secondary text-white bg-transparent"
                    placeholder="Ex: Mandioca com patinho grelhado ou 3 ovos mexidos"
                    value={expressInput}
                    onChange={(e) => setExpressInput(e.target.value)}
                  />
                  <button
                    className="btn btn-outline-warning text-warning d-flex align-items-center gap-1"
                    type="button"
                    onClick={handleExpressMealParse}
                    disabled={isExpressLoading}
                    style={{ background: "rgba(212, 175, 55, 0.05)" }}
                  >
                    <i className="bi bi-magic"></i>
                    {isExpressLoading ? "Calculando..." : "Estimar"}
                  </button>
                </div>
                {expressError && (
                  <div className="text-danger small mt-1" style={{ fontSize: "0.7rem" }}>
                    {expressError}
                  </div>
                )}
              </div>

              <div className="col-6 col-md-3">
                <input
                  type="number"
                  className="form-control form-control-sm border-secondary text-white bg-transparent"
                  name="calorias"
                  placeholder="Kcal"
                  min="0"
                  value={caloriesInput}
                  onChange={(e) => setCaloriesInput(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="number"
                  className="form-control form-control-sm border-secondary text-white bg-transparent"
                  name="proteina"
                  placeholder="P (g)"
                  min="0"
                  value={proteinInput}
                  onChange={(e) => setProteinInput(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="number"
                  className="form-control form-control-sm border-secondary text-white bg-transparent"
                  name="carboidrato"
                  placeholder="C (g)"
                  min="0"
                  value={carbsInput}
                  onChange={(e) => setCarbsInput(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="number"
                  className="form-control form-control-sm border-secondary text-white bg-transparent"
                  name="gordura"
                  placeholder="G (g)"
                  min="0"
                  value={fatInput}
                  onChange={(e) => setFatInput(e.target.value)}
                />
              </div>
              <div className="col-12 mt-2">
                <button type="submit" className="btn btn-sm btn-ascend w-100">
                  Registrar Ingestão
                </button>
              </div>
            </form>

            {/* Controle de Hidratação */}
            <div
              className="hydration-container p-3 rounded"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(226,201,133,0.1)" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <span
                    className="d-block text-muted small"
                    style={{ fontSize: "0.65rem", fontWeight: 700 }}
                  >
                    CONTROLE DE ÁGUA
                  </span>
                  <strong className="fs-4 blue-text">
                    <span id="lbl-agua">{agua}</span> <span className="text-muted fs-6">/ {waterGoal} ml</span>
                  </strong>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0"
                    title="Configurar Peso"
                    onClick={() => {
                      const newPeso = prompt("Digite seu peso atual em kg (ex: 75.5):", peso?.toString() || "");
                      if (newPeso) {
                        const parsed = parseFloat(newPeso);
                        if (!isNaN(parsed) && parsed > 0) {
                          handleUpdateWeight(parsed);
                        }
                      }
                    }}
                    style={{ minWidth: "24px", minHeight: "24px" }}
                  >
                    <i className="bi bi-gear" />
                  </button>
                  <span className="bi bi-droplet-fill fs-3 blue-text animate-pulse" />
                </div>
              </div>

              {/* Progresso visual da água */}
              <div className="progress mb-3" style={{ height: "6px", background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="progress-bar bg-info"
                  role="progressbar"
                  style={{ width: `${Math.min((agua / waterGoal) * 100, 100)}%`, transition: "width 0.5s ease" }}
                />
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ascend-outline flex-grow-1"
                  onClick={() => handleAddWater(200)}
                >
                  +200ml
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ascend-outline flex-grow-1"
                  onClick={() => handleAddWater(500)}
                >
                  +500ml
                </button>
              </div>

              {peso && (
                <div className="text-center mt-2" style={{ fontSize: "0.65rem" }}>
                  <span className="text-muted">Meta por peso: </span>
                  <span className="gold-text fw-bold">{peso} kg ({peso} x 35ml)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Construtor e Ficha de Treinos com Roteiro Semanal (Direita) */}
        <div className="col-lg-7 col-md-12">
          <div className="ascend-card p-4 h-100">
            {/* Agenda Semanal de Dias */}
            <div className="mb-4">
              <span className="d-block text-muted small mb-2" style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px" }}>
                CRONOGRAMA DE ATIVIDADES
              </span>
              <div className="d-flex flex-wrap gap-1 bg-transparent p-1 rounded border" style={{ borderColor: "rgba(226,201,133,0.15)" }}>
                {dbDiasAbrev.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayTab(day)}
                    className={`btn btn-xs flex-grow-1 py-2 ${selectedDayTab === day ? "btn-ascend" : "btn-link text-white text-decoration-none"}`}
                    style={{ minWidth: "40px", fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    {day}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedDayTab("Todos")}
                  className={`btn btn-xs py-2 px-3 ${selectedDayTab === "Todos" ? "btn-ascend" : "btn-link text-white text-decoration-none"}`}
                  style={{ fontSize: "0.78rem", fontWeight: 700 }}
                >
                  Ver Tudo
                </button>
              </div>
            </div>

            <h3 className="ascend-title mb-4" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
              {selectedDayTab === "Todos" ? "Todas as Rotinas Ativas" : `Atividades planejadas para ${dbDiasNomesCompletos[selectedDayTab]}`}
            </h3>

            {activeWorkouts.length === 0 ? (
              <div
                className="text-center py-5 border rounded"
                style={{ border: "1px dashed var(--border-color) !important" }}
              >
                <span className="bi bi-calendar-check display-6 text-muted mb-3 d-block" />
                <h4 className="ascend-title mb-2" style={{ fontSize: "1rem" }}>Dia de Descanso & Recuperação</h4>
                <p className="text-muted small">Nenhuma atividade agendada para hoje. Aproveite para focar na nutrição e hidratação! 🧘‍♂️🌱</p>
              </div>
            ) : (
              <div className="accordion accordion-premium animate-fade-in" id="accordionTreinos">
                {activeWorkouts.map((workout) => (
                  <div
                    className="accordion-item mb-3 rounded overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(226,201,133,0.15)" }}
                    key={workout.id}
                  >
                    <h2 className="accordion-header" id={`heading-${workout.id}`}>
                      <button
                        className="accordion-button collapsed px-4 py-3 text-white bg-transparent"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${workout.id}`}
                        aria-expanded="false"
                        aria-controls={`collapse-${workout.id}`}
                      >
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <div>
                            <strong className="d-block" style={{ fontSize: "1.05rem", color: "var(--cream)" }}>
                              {workout.nome}
                            </strong>
                            <div className="d-flex gap-2 align-items-center mt-1">
                              {workout.conteudo ? (
                                <span className="badge bg-secondary text-white-50" style={{ fontSize: "0.68rem" }}>
                                  <i className="bi bi-activity"></i> Cardio/Outros
                                </span>
                              ) : (
                                <span className="badge bg-primary text-white-50" style={{ fontSize: "0.68rem" }}>
                                  <i className="bi bi-heart-pulse-fill"></i> Musculação
                                </span>
                              )}
                              <span className="text-muted small" style={{ fontSize: "0.73rem" }}>
                                Dias: {workout.dias_semana || "Nenhum agendado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div
                      id={`collapse-${workout.id}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading-${workout.id}`}
                      data-bs-parent="#accordionTreinos"
                    >
                      <div
                        className="accordion-body p-4 border-top"
                        style={{ borderTopColor: "rgba(226,201,133,0.15) !important" }}
                      >
                        {workout.conteudo ? (
                          /* Visualização para Cardio/Corrida/Luta */
                          <div className="mb-4">
                            <span className="d-block text-muted small mb-2" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                              DIRETRIZES DA ROTINA
                            </span>
                            <div
                              className="p-3 rounded mb-4"
                              style={{ background: "rgba(226,201,133,0.03)", border: "1px solid rgba(226,201,133,0.1)", whiteSpace: "pre-wrap", color: "#f3ead8", fontSize: "0.92rem" }}
                            >
                              {workout.conteudo}
                            </div>
                            <div className="d-flex justify-content-end gap-2">
                              <form onSubmit={(e) => handleDeleteWorkout(e, workout.id)}>
                                <button type="submit" className="btn btn-sm btn-outline-danger">
                                  Excluir Rotina
                                </button>
                              </form>
                              <button
                                className="btn btn-sm btn-ascend"
                                onClick={() => handleConcluirTreino(workout.id)}
                              >
                                <i className="bi bi-check2-circle"></i> Concluir Atividade
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Visualização para Musculação */
                          <>
                            {workout.exercises.length === 0 ? (
                              <div className="text-center py-3">
                                <p className="text-muted small mb-3">Nenhum exercício neste treino.</p>
                                <button
                                  className="btn btn-xs btn-ascend-outline"
                                  onClick={() => {
                                    setExerciseModalTab("individual");
                                    setActiveExerciseWorkoutId(workout.id);
                                  }}
                                >
                                  + Adicionar Exercício
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="table-responsive mb-4">
                                  <table
                                    className="table table-borderless align-middle text-white mb-0"
                                    style={{ fontSize: "0.9rem" }}
                                  >
                                    <thead>
                                      <tr
                                        className="text-muted small border-bottom"
                                        style={{ borderBottomColor: "rgba(226,201,133,0.1) !important" }}
                                      >
                                        <th style={{ width: "50%" }}>Exercício</th>
                                        <th style={{ width: "15%" }}>Séries</th>
                                        <th style={{ width: "15%" }}>Reps</th>
                                        <th style={{ width: "20%" }} className="text-end">
                                          Carga (kg)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {workout.exercises.map((ex) => (
                                        <tr
                                          className="border-bottom"
                                          style={{ borderBottomColor: "rgba(255,255,255,0.02) !important" }}
                                          key={ex.id}
                                        >
                                          <td>
                                            <div className="d-flex align-items-center gap-2">
                                              <strong className="text-white">{ex.nome_exercicio}</strong>
                                              <button
                                                type="button"
                                                className="btn btn-link text-muted p-0"
                                                title="Histórico de Carga"
                                                style={{ minWidth: "24px", minHeight: "24px", display: "inline-flex", alignItems: "center" }}
                                                onClick={() => openHistoryChart(ex)}
                                              >
                                                <i className="bi bi-graph-up gold-text" style={{ fontSize: "0.85rem" }} />
                                              </button>
                                            </div>
                                          </td>
                                          <td>{ex.series}</td>
                                          <td>{ex.repeticoes}</td>
                                          <td className="text-end">
                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                              <input
                                                type="number"
                                                step="0.5"
                                                className="form-control form-control-sm border-secondary text-white bg-transparent text-end"
                                                style={{ width: "70px" }}
                                                defaultValue={ex.carga_atual ?? 0}
                                                onChange={(e) => handleSaveCarga(ex.id, e.target.value)}
                                              />
                                              <form
                                                onSubmit={(e) => handleDeleteExercise(e, workout.id, ex.id)}
                                                style={{ display: "inline" }}
                                              >
                                                <button type="submit" className="btn btn-link text-danger p-0">
                                                  <span className="bi bi-trash" />
                                                </button>
                                              </form>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                  <button
                                    className="btn btn-sm btn-ascend-outline"
                                    onClick={() => {
                                      setExerciseModalTab("individual");
                                      setActiveExerciseWorkoutId(workout.id);
                                    }}
                                  >
                                    <i className="bi bi-plus-lg"></i> Adicionar Exercício
                                  </button>
                                  <div className="d-flex gap-2">
                                    <form onSubmit={(e) => handleDeleteWorkout(e, workout.id)}>
                                      <button type="submit" className="btn btn-sm btn-outline-danger">
                                        Excluir Ficha
                                      </button>
                                    </form>
                                    <button
                                      className="btn btn-sm btn-ascend"
                                      onClick={() => handleConcluirTreino(workout.id)}
                                    >
                                      <i className="bi bi-check2-circle"></i> Concluir Treino
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS DA PÁGINA (Puro React) */}

      {/* Modal Super-Carregado de Novo Treino */}
      {isNovoTreinoOpen && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }} tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div
              className="modal-content"
              style={{ background: "#0d1611", border: "1px solid var(--border-color)", borderRadius: "24px" }}
            >
              <div className="modal-header border-0 px-4 pt-4">
                <h4 className="modal-title text-white">Adicionar Novo Planejamento</h4>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsNovoTreinoOpen(false)}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleCreateWorkout}>
                <div className="modal-body px-4">
                  {/* Nome do Treino */}
                  <div className="mb-3">
                    <label className="form-label text-muted">Nome da Rotina / Atividade</label>
                    <input
                      type="text"
                      className="form-control bg-transparent text-white border-secondary"
                      value={newWorkoutName}
                      onChange={(e) => setNewWorkoutName(e.target.value)}
                      placeholder="Ex: Treino A - Pernas ou Corrida de Longa Distância"
                      required
                    />
                  </div>

                  {/* Seleção do Tipo */}
                  <div className="mb-3">
                    <label className="form-label text-muted d-block">Tipo da Rotina</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="newWorkoutType"
                          id="typeMusculacao"
                          checked={newWorkoutType === "musculacao"}
                          onChange={() => setNewWorkoutType("musculacao")}
                        />
                        <label className="form-check-label text-white" htmlFor="typeMusculacao">
                          Musculação / Academia (Registrar cargas de exercícios)
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="newWorkoutType"
                          id="typeCardio"
                          checked={newWorkoutType === "cardio"}
                          onChange={() => setNewWorkoutType("cardio")}
                        />
                        <label className="form-check-label text-white" htmlFor="typeCardio">
                          Cardio / Esporte / Luta (Corrida, Futebol, Boxe...)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dias da Semana */}
                  <div className="mb-3">
                    <label className="form-label text-muted d-block">Dias Agendados</label>
                    <div className="d-flex flex-wrap gap-2">
                      {dbDiasAbrev.map((day) => {
                        const active = newWorkoutDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleNewWorkoutDay(day)}
                            className={`btn btn-xs px-3 py-2 ${active ? "btn-ascend" : "btn-ascend-outline"}`}
                            style={{ minWidth: "50px", fontWeight: 700 }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campos Condicionais conforme o Tipo */}
                  {newWorkoutType === "musculacao" ? (
                    <div className="mb-3">
                      <label className="form-label text-muted d-block mb-1">
                        Exercícios da Ficha (Uma linha por exercício - Opcional)
                      </label>
                      <textarea
                        className="form-control bg-transparent text-white border-secondary"
                        style={{ height: "140px", fontFamily: "monospace", fontSize: "0.82rem" }}
                        value={newWorkoutBatchExercises}
                        onChange={(e) => setNewWorkoutBatchExercises(e.target.value)}
                        placeholder={`Copie e cole sua lista de exercícios aqui se quiser:\nSupino Reto 4x10 24kg\nPuxada Alta 4x8-12 55kg\nAgachamento Livre 4x8 60kg`}
                      />
                      <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
                        💡 Você pode cadastrar o treino vazio agora e adicionar os exercícios depois!
                      </small>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label text-muted d-block">Diretrizes da Atividade / Roteiro</label>
                      <textarea
                        className="form-control bg-transparent text-white border-secondary"
                        style={{ height: "140px" }}
                        value={newWorkoutContent}
                        onChange={(e) => setNewWorkoutContent(e.target.value)}
                        placeholder="Ex: Treino de Boxe na assessoria, foco em movimentação e saco de pancadas (60 min).\nOu: Corrida contínua 8km em ritmo de Z2 (frequência cardíaca abaixo de 145 bpm)."
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <button
                    type="button"
                    className="btn btn-secondary rounded-pill"
                    onClick={() => setIsNovoTreinoOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-ascend">
                    Cadastrar Planejamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Meta */}
      {isConfigMetaOpen && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }} tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content"
              style={{ background: "#0d1611", border: "1px solid var(--border-color)", borderRadius: "24px" }}
            >
              <div className="modal-header border-0 px-4 pt-4">
                <h4 className="modal-title text-white">Configurar Meta Diária de Calorias</h4>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsConfigMetaOpen(false)}
                  aria-label="Close"
                ></button>
              </div>
              <form id="form-config-meta" onSubmit={handleUpdateMeta}>
                <div className="modal-body px-4">
                  <div className="mb-3">
                    <label className="form-label text-muted">Calorias Recomendadas para Evolução</label>
                    <input
                      type="number"
                      className="form-control bg-transparent text-white border-secondary"
                      name="calorias_meta"
                      defaultValue={nutrition.calorias_meta ?? 2000}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <button
                    type="button"
                    className="btn btn-secondary rounded-pill"
                    onClick={() => setIsConfigMetaOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-ascend">
                    Salvar Alteração
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exercício Dinâmico */}
      {activeExerciseWorkoutId !== null && (() => {
        const activeWorkout = workoutsList.find(w => w.id === activeExerciseWorkoutId);
        if (!activeWorkout) return null;

        return (
          <div
            className="modal fade show"
            style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
            tabIndex={-1}
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div
                className="modal-content"
                style={{ background: "#0d1611", border: "1px solid var(--border-color)", borderRadius: "24px" }}
              >
                <div className="modal-header border-0 px-4 pt-4">
                  <div>
                    <h4 className="modal-title text-white">Estruturar Exercícios em {activeWorkout.nome}</h4>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setActiveExerciseWorkoutId(null)}
                    aria-label="Close"
                  ></button>
                </div>

                {/* Seleção de Abas */}
                <div className="px-4 mb-3">
                  <div className="nav nav-pills gap-2" style={{ borderBottom: "1px solid rgba(226,201,133,0.1)", paddingBottom: "12px" }}>
                    <button
                      className={`btn btn-sm ${exerciseModalTab === "individual" ? "btn-ascend" : "btn-ascend-outline"}`}
                      onClick={() => setExerciseModalTab("individual")}
                    >
                      <i className="bi bi-file-earmark-plus"></i> Lançar Único
                    </button>
                    <button
                      className={`btn btn-sm ${exerciseModalTab === "batch" ? "btn-ascend" : "btn-ascend-outline"}`}
                      onClick={() => setExerciseModalTab("batch")}
                    >
                      <i className="bi bi-file-earmark-spreadsheet"></i> Importar Lista (WhatsApp / Notas)
                    </button>
                  </div>
                </div>

                {exerciseModalTab === "individual" ? (
                  <form onSubmit={(e) => handleCreateExercise(e, activeWorkout.id)}>
                    <div className="modal-body px-4">
                      <div className="mb-3">
                        <label className="form-label text-muted">Nome do Exercício</label>
                        <input
                          type="text"
                          className="form-control bg-transparent text-white border-secondary"
                          name="nome_exercicio"
                          placeholder="Ex: Cross Polia Alta"
                          required
                        />
                      </div>
                      <div className="row g-2">
                        <div className="col-4">
                          <label className="form-label text-muted">Séries</label>
                          <input
                            type="number"
                            className="form-control bg-transparent text-white border-secondary"
                            name="series"
                            defaultValue="4"
                            required
                          />
                        </div>
                        <div className="col-4">
                          <label className="form-label text-muted">Repetições</label>
                          <input
                            type="text"
                            className="form-control bg-transparent text-white border-secondary"
                            name="repeticoes"
                            defaultValue="8-12"
                            required
                          />
                        </div>
                        <div className="col-4">
                          <label className="form-label text-muted">Carga (kg)</label>
                          <input
                            type="number"
                            step="0.5"
                            className="form-control bg-transparent text-white border-secondary"
                            name="carga"
                            defaultValue="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer border-0 px-4 pb-4">
                      <button
                        type="button"
                        className="btn btn-secondary rounded-pill"
                        onClick={() => setActiveExerciseWorkoutId(null)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-ascend">
                        Salvar Exercício
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={(e) => handleBatchImport(e, activeWorkout.id)}>
                    <div className="modal-body px-4">
                      <div className="mb-3">
                        <label className="form-label text-muted d-block mb-2">Cole sua rotina de treinos (uma linha por exercício)</label>
                        <textarea
                          className="form-control bg-transparent text-white border-secondary"
                          style={{ height: "220px", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: "1.5" }}
                          value={batchText}
                          onChange={(e) => setBatchText(e.target.value)}
                          placeholder={`Copie e cole como no exemplo:\nSupino Reto 4x8-12 24kg\nPuxada Alta 4x10 60kg\nRosca Alternada 3x12 14kg\nAgachamento Livre 4x10 80kg`}
                          required
                        />
                      </div>
                      
                      {/* Preview em tempo real da importação */}
                      {batchText.trim() && (
                        <div className="mb-3 p-3 rounded text-start" style={{ background: "rgba(226,201,133,0.02)", border: "1px dashed rgba(226,201,133,0.2)" }}>
                          <span className="d-block text-muted small mb-2 fw-bold" style={{ fontSize: "0.7rem", letterSpacing: "1px" }}>
                            🔍 PREVIEW EM TEMPO REAL DA IMPORTAÇÃO EM LOTE
                          </span>
                          <div className="table-responsive" style={{ maxHeight: "180px", overflowY: "auto" }}>
                            <table className="table table-sm table-dark table-borderless mb-0 align-middle" style={{ fontSize: "0.78rem" }}>
                              <thead>
                                <tr className="border-bottom border-secondary text-muted">
                                  <th>Exercício</th>
                                  <th className="text-center">Séries</th>
                                  <th className="text-center">Repetições</th>
                                  <th className="text-end">Carga</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batchText.split("\n").map((line, idx) => {
                                  const parsed = parseExerciseLine(line);
                                  if (!parsed || !parsed.nome_exercicio) return null;
                                  return (
                                    <tr key={idx} className="border-bottom border-dark" style={{ borderBottomColor: "rgba(255,255,255,0.02) !important" }}>
                                      <td className="text-white fw-bold py-2">{parsed.nome_exercicio}</td>
                                      <td className="text-center text-muted py-2">{parsed.series}</td>
                                      <td className="text-center text-muted py-2">{parsed.repeticoes}</td>
                                      <td className="text-end text-success fw-bold py-2">{parsed.carga_atual} kg</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      <small className="text-muted d-block" style={{ fontSize: "0.78rem" }}>
                        <i className="bi bi-magic gold-text"></i> O sistema detectará automaticamente: o nome do exercício, número de séries, repetições (ex: 8-12 ou 10) e a carga de peso!
                      </small>
                    </div>
                    <div className="modal-footer border-0 px-4 pb-4">
                      <button
                        type="button"
                        className="btn btn-secondary rounded-pill"
                        onClick={() => {
                          setBatchText("");
                          setActiveExerciseWorkoutId(null);
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-ascend">
                        <i className="bi bi-cloud-arrow-up"></i> Processar e Importar Tudo
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Histórico de Cargas (Progressive Overload) */}
      {historyModalExercise && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-white border border-secondary" style={{ background: "#111" }}>
              <div className="modal-header border-bottom border-secondary px-4">
                <h5 className="modal-title gold-text">
                  <i className="bi bi-graph-up me-2" />
                  Histórico de Carga: {historyModalExercise.nome_exercicio}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setHistoryModalExercise(null)}
                  aria-label="Fechar"
                />
              </div>
              <div className="modal-body p-4">
                <div style={{ height: "250px", position: "relative" }}>
                  <canvas ref={chartCanvasRef} />
                </div>
                <div className="text-center mt-3 text-muted small">
                  Histórico das últimas 10 alterações de carga registradas para este exercício.
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button
                  type="button"
                  className="btn btn-sm btn-ascend-outline w-100"
                  onClick={() => setHistoryModalExercise(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaudeClientInitial;
