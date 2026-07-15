"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useLevelUp } from "./LevelUpContext";
import Chart from "chart.js/auto";
import { parseExpressMealAction, parseExpressWorkoutAction, generateHealthReportAction } from "@/app/saude/actions";

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

interface WeightPoint {
  id: number;
  peso: number;
  dataRegistro: string;
}

interface NutritionPoint {
  id: number;
  caloriasConsumidas: number;
  caloriasMeta: number;
  aguaMl: number;
  data: string;
}

interface LoadPoint {
  id: number;
  carga: number;
  dataRegistro: string;
}

interface AIReport {
  id: number;
  criadoEm: string;
  tipo: string;
  conteudo: string;
  insights: {
    pontosFortes: string[];
    melhorias: string[];
    previsaoTdee: number;
  };
}

interface SaudeClientInitialProps {
  user: {
    id: number;
    nome: string;
    nivel: number;
    xp_total: number;
    avatar?: string | null;
    peso?: number | null;
  };
  initialNutrition: Nutrition;
  workouts: Workout[];
  workoutLogs: any[];
  initialWeights: WeightPoint[];
  initialNutritions: NutritionPoint[];
  initialLoadHistory: LoadPoint[];
  initialReports: AIReport[];
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
  initialWeights,
  initialNutritions,
  initialLoadHistory,
  initialReports,
}) => {
  const [nutrition, setNutrition] = useState<Nutrition>(initialNutrition);
  const [agua, setAgua] = useState<number>(initialNutrition.agua_ml || 0);
  const [workoutsList, setWorkoutsList] = useState<Workout[]>(workouts);

  const { triggerLevelUp } = useLevelUp();

  const [peso, setPeso] = useState<number | null>(user.peso || null);
  const waterGoal = peso ? Math.round(peso * 35) : 2000;

  // Estados e Memos do Painel de Evolução & Diagnósticos IA
  const [reports, setReports] = useState<AIReport[]>(initialReports);
  const [reportType, setReportType] = useState<"SEMANAL" | "MENSAL" | "TREINO">("SEMANAL");
  const [loadingReport, setLoadingReport] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Gerar relatório de evolução por IA
  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setStatusMsg("Analisando registros de saúde, cargas e evolução...");
    try {
      const res = await generateHealthReportAction(reportType);
      if (res.success) {
        window.location.reload();
      } else {
        setStatusMsg("Erro: " + res.message);
      }
    } catch (err: any) {
      setStatusMsg("Erro: " + err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    yPeso: number;
    yCarga: number;
    label: string;
    peso: number;
    volumeCarga: number;
  } | null>(null);

  // 1. Processar dados para o Gráfico de Linha de Duplo Eixo (últimos 30 dias)
  const chartData = useMemo(() => {
    const dataPoints = [];
    const hoje = new Date();
    const currentWeight = user.peso || 80;
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayVal = String(d.getDate()).padStart(2, "0");
      const compStr = `${year}-${month}-${dayVal}`;

      // Encontrar peso mais próximo registrado
      const weightRecord = [...initialWeights]
        .reverse()
        .find(w => w.dataRegistro.split("T")[0] <= compStr);
      const pesoVal = weightRecord ? weightRecord.peso : currentWeight;

      // Calcular volume de carga total desse dia
      const loadForDay = initialLoadHistory
        .filter(lh => lh.dataRegistro.split("T")[0] === compStr)
        .reduce((sum, curr) => sum + curr.carga, 0);

      dataPoints.push({
        label: dateStr,
        peso: pesoVal,
        volumeCarga: loadForDay || 0,
      });
    }
    return dataPoints;
  }, [initialWeights, initialLoadHistory, user.peso]);

  // Coordenadas SVG e Normalizações
  const svgPaths = useMemo(() => {
    const width = 600;
    const height = 250;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const currentWeight = user.peso || 80;

    const pesos = chartData.map(d => d.peso);
    const cargas = chartData.map(d => d.volumeCarga);

    const minPeso = Math.min(...pesos, currentWeight - 5) * 0.98;
    const maxPeso = Math.max(...pesos, currentWeight + 5) * 1.02;
    const minCarga = Math.min(...cargas, 10) * 0.9;
    const maxCarga = Math.max(...cargas, 100) * 1.1;

    const getX = (index: number) => padding + (index / (chartData.length - 1)) * chartWidth;
    const getY = (value: number, min: number, max: number) => {
      if (max === min) return chartHeight / 2 + padding;
      return chartHeight + padding - ((value - min) / (max - min)) * chartHeight;
    };

    let pesoPoints = "";
    let cargaPoints = "";

    chartData.forEach((pt, i) => {
      const x = getX(i);
      const yPeso = getY(pt.peso, minPeso, maxPeso);
      const yCarga = getY(pt.volumeCarga, minCarga, maxCarga);

      if (i === 0) {
        pesoPoints = `M ${x} ${yPeso}`;
        cargaPoints = `M ${x} ${yCarga}`;
      } else {
        pesoPoints += ` L ${x} ${yPeso}`;
        cargaPoints += ` L ${x} ${yCarga}`;
      }
    });

    let pesoFillPoints = "";
    let cargaFillPoints = "";

    if (chartData.length > 0) {
      const x0 = getX(0);
      const xN = getX(chartData.length - 1);
      const baseY = chartHeight + padding;

      const firstY = getY(chartData[0].peso, minPeso, maxPeso);
      pesoFillPoints = `M ${x0} ${baseY} L ${x0} ${firstY} ${pesoPoints.substring(pesoPoints.indexOf(" L"))} L ${xN} ${baseY} Z`;

      const firstCargaY = getY(chartData[0].volumeCarga, minCarga, maxCarga);
      cargaFillPoints = `M ${x0} ${baseY} L ${x0} ${firstCargaY} ${cargaPoints.substring(cargaPoints.indexOf(" L"))} L ${xN} ${baseY} Z`;
    }

    return { pesoPoints, cargaPoints, pesoFillPoints, cargaFillPoints, minPeso, maxPeso, minCarga, maxCarga, getX, getY, chartWidth, chartHeight, padding };
  }, [chartData, user.peso]);

  // 2. Processar dados para o Mapa de Calor (últimos 180 dias)
  const heatmapData = useMemo(() => {
    const days = [];
    const hoje = new Date();
    
    // Alinha para começar num domingo para organizar por semanas
    const startOffset = hoje.getDay();
    const totalDays = 168 + startOffset; // 24 semanas completas

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayVal = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${dayVal}`;

      // Critério 1: Bateu macros (calorias)
      const nutritionRec = initialNutritions.find(n => n.data.split("T")[0] === dateKey);
      const bateuCalorias = nutritionRec ? (nutritionRec.caloriasConsumidas >= nutritionRec.caloriasMeta) : false;

      // Critério 2: Bateu água (>= 2 litros)
      const bateuAgua = nutritionRec ? (nutritionRec.aguaMl >= 2000) : false;

      // Critério 3: Treinou
      const treinou = workoutLogs.some(wl => wl.data_conclusao.split("T")[0] === dateKey);

      let score = 0;
      if (bateuCalorias) score += 1;
      if (bateuAgua) score += 1;
      if (treinou) score += 1;

      days.push({
        date: d.toLocaleDateString("pt-BR"),
        score,
        details: `${treinou ? "✓ Treinou" : "✗ Não Treinou"} | ${bateuCalorias ? "✓ Macros Bateu" : "✗ Sem Macros"} | ${bateuAgua ? "✓ Água OK" : "✗ Pouca Água"}`,
      });
    }
    return days;
  }, [initialNutritions, workoutLogs]);

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

  // Estados para Registro de Treino Expresso com IA
  const [workoutTextInput, setWorkoutTextInput] = useState("");
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);

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

  // Registrar Treino Expresso com IA
  const handleExpressWorkoutRegister = async () => {
    if (!workoutTextInput.trim()) {
      setWorkoutError("Por favor, digite a descrição do seu treino.");
      return;
    }
    setIsWorkoutLoading(true);
    setWorkoutError(null);
    try {
      const res = await parseExpressWorkoutAction(workoutTextInput);
      if (res.success) {
        setWorkoutTextInput("");
        if (res.nivel_subiu) {
          triggerLevelUp(res.usuario_nivel - 1, res.usuario_nivel);
        } else {
          if (typeof window !== "undefined" && (window as any).AscendSFX) {
            (window as any).AscendSFX.playSuccess();
          }
          confetti({
            particleCount: 150,
            spread: 85,
            origin: { y: 0.6 },
          });
          alert(`${res.mensagem} (+${res.xp_ganho} XP!)`);
          window.location.reload();
        }
      } else {
        setWorkoutError("Erro na IA: " + res.message);
      }
    } catch (err: any) {
      setWorkoutError("Erro de conexão: " + err.message);
    } finally {
      setIsWorkoutLoading(false);
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
  const currentPeso = peso || user.peso || 80;
  
  // Metas de macros calculadas de forma a somar exatamente a meta calórica
  const proteinTarget = Math.round(currentPeso * 2);
  const fatTarget = Math.round(currentPeso * 0.8);
  const carbTarget = Math.max(Math.round((caloriasMeta - (proteinTarget * 4 + fatTarget * 9)) / 4), 0);

  return (
    <div className="container-fluid py-4">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge-old mb-2" style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
            <i className="bi bi-heart-pulse-fill"></i> Central de Performance & Saúde
          </span>
          <h2 className="ascend-title mb-0" style={{ fontSize: "1.8rem" }}>Dashboard Geral</h2>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-ascend"
            onClick={() => setIsNovoTreinoOpen(true)}
          >
            <i className="bi bi-plus-lg"></i> Novo Treino
          </button>
        </div>
      </div>

      {/* Grid Central */}
      <div className="row g-4 fade-in-up">
        {/* COLUNA ESQUERDA (Evolução & IA) */}
        <div className="col-lg-7 col-md-12">
          
          {/* Gráfico SVG de Duplo Eixo */}
          <div className="glass-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="ascend-title mb-0" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
                  Evolução Temporal
                </h3>
                <span className="text-muted small">Evolução do seu Peso Corporal vs. Carga de Musculação</span>
              </div>
              <div className="d-flex gap-3 text-end" style={{ fontSize: "0.75rem" }}>
                <div>
                  <span className="d-inline-block rounded-circle me-1" style={{ width: "8px", height: "8px", background: "var(--gold)" }}></span>
                  <span className="text-muted">Carga total (kg)</span>
                </div>
                <div>
                  <span className="d-inline-block rounded-circle me-1" style={{ width: "8px", height: "8px", background: "#4b88be" }}></span>
                  <span className="text-muted">Peso (kg)</span>
                </div>
              </div>
            </div>

            {/* Render do Gráfico SVG */}
            <div className="position-relative" style={{ height: "250px" }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 600 250"
                preserveAspectRatio="none"
                style={{ overflow: "visible" }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const ratio = mouseX / rect.width;
                  const targetX = ratio * 600;

                  // Achar ponto mais próximo em chartData
                  const stepWidth = (600 - svgPaths.padding * 2) / (chartData.length - 1);
                  let idx = Math.round((targetX - svgPaths.padding) / stepWidth);
                  idx = Math.max(0, Math.min(chartData.length - 1, idx));

                  const pt = chartData[idx];
                  const x = svgPaths.getX(idx);
                  const yPeso = svgPaths.getY(pt.peso, svgPaths.minPeso, svgPaths.maxPeso);
                  const yCarga = svgPaths.getY(pt.volumeCarga, svgPaths.minCarga, svgPaths.maxCarga);

                  setHoveredPoint({
                    x,
                    yPeso,
                    yCarga,
                    label: pt.label,
                    peso: pt.peso,
                    volumeCarga: pt.volumeCarga,
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Definições de Gradientes */}
                <defs>
                  <linearGradient id="gradientPeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4b88be" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4b88be" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradientCarga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grade de fundo horizontal */}
                <line x1={svgPaths.padding} y1={svgPaths.padding} x2={600 - svgPaths.padding} y2={svgPaths.padding} stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                <line x1={svgPaths.padding} y1={svgPaths.padding + svgPaths.chartHeight / 2} x2={600 - svgPaths.padding} y2={svgPaths.padding + svgPaths.chartHeight / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                <line x1={svgPaths.padding} y1={svgPaths.padding + svgPaths.chartHeight} x2={600 - svgPaths.padding} y2={svgPaths.padding + svgPaths.chartHeight} stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />

                {/* Áreas com Gradiente */}
                {svgPaths.pesoFillPoints && <path d={svgPaths.pesoFillPoints} fill="url(#gradientPeso)" />}
                {svgPaths.cargaFillPoints && <path d={svgPaths.cargaFillPoints} fill="url(#gradientCarga)" />}

                {/* Linhas Principais */}
                {svgPaths.pesoPoints && <path d={svgPaths.pesoPoints} fill="none" stroke="#4b88be" strokeWidth="2.5" />}
                {svgPaths.cargaPoints && <path d={svgPaths.cargaPoints} fill="none" stroke="var(--gold)" strokeWidth="2.5" />}

                {/* Linha vertical e pontos em foco (Hover) */}
                {hoveredPoint && (
                  <>
                    <line
                      x1={hoveredPoint.x}
                      y1={svgPaths.padding}
                      x2={hoveredPoint.x}
                      y2={svgPaths.padding + svgPaths.chartHeight}
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4,4"
                    />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.yPeso} r="6" fill="#4b88be" stroke="#fff" strokeWidth="1.5" />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.yCarga} r="6" fill="var(--gold)" stroke="#fff" strokeWidth="1.5" />
                  </>
                )}
              </svg>

              {/* Tooltip flutuante dinâmico */}
              {hoveredPoint && (
                <div
                  className="position-absolute p-2.5 rounded shadow text-white border"
                  style={{
                    left: `${(hoveredPoint.x / 600) * 100}%`,
                    top: "10%",
                    transform: "translateX(-50%)",
                    background: "rgba(10, 18, 12, 0.9)",
                    borderColor: "rgba(212, 175, 55, 0.3)",
                    fontSize: "0.75rem",
                    zIndex: 10,
                    pointerEvents: "none",
                    minWidth: "125px",
                  }}
                >
                  <strong className="d-block text-warning text-center border-bottom border-secondary pb-1 mb-1">
                    {hoveredPoint.label}
                  </strong>
                  <div className="d-flex justify-content-between gap-3">
                    <span className="text-muted">Peso:</span>
                    <span className="fw-bold">{hoveredPoint.peso} kg</span>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <span className="text-muted">Volume:</span>
                    <span className="fw-bold text-warning">{hoveredPoint.volumeCarga} kg</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mapa de Consistência */}
          <div className="glass-card p-4 mb-4">
            <h3 className="ascend-title mb-1" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
              Mapa de Consistência (180 Dias)
            </h3>
            <p className="text-muted small mb-3">Sua assiduidade de hábitos de treino, água e macros diários.</p>

            <div className="d-flex flex-column align-items-center">
              {/* Heatmap Grid */}
              <div
                className="d-flex flex-wrap gap-1 justify-content-start w-100 overflow-auto py-1"
                style={{ maxHeight: "160px" }}
              >
                {heatmapData.map((day, idx) => {
                  let bgColor = "rgba(255,255,255,0.03)";
                  let borderStyle = "1px solid rgba(255,255,255,0.05)";

                  if (day.score === 1) {
                    bgColor = "rgba(212, 175, 55, 0.2)";
                    borderStyle = "1px solid rgba(212, 175, 55, 0.15)";
                  } else if (day.score === 2) {
                    bgColor = "rgba(212, 175, 55, 0.45)";
                    borderStyle = "1px solid rgba(212, 175, 55, 0.35)";
                  } else if (day.score === 3) {
                    bgColor = "rgba(212, 175, 55, 0.85)";
                    borderStyle = "1px solid rgba(212, 175, 55, 0.75)";
                  }

                  return (
                    <div
                      key={idx}
                      className="rounded-1 position-relative"
                      style={{
                        width: "12px",
                        height: "12px",
                        background: bgColor,
                        border: borderStyle,
                        cursor: "pointer",
                      }}
                      title={`${day.date} - ${day.details}`}
                    />
                  );
                })}
              </div>

              {/* Legenda do Mapa */}
              <div className="d-flex justify-content-between align-items-center w-100 mt-3 text-muted small" style={{ fontSize: "0.72rem" }}>
                <span>Menos consistente</span>
                <div className="d-flex gap-1 align-items-center">
                  <div className="rounded-1" style={{ width: "10px", height: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}></div>
                  <div className="rounded-1" style={{ width: "10px", height: "10px", background: "rgba(212, 175, 55, 0.2)" }}></div>
                  <div className="rounded-1" style={{ width: "10px", height: "10px", background: "rgba(212, 175, 55, 0.45)" }}></div>
                  <div className="rounded-1" style={{ width: "10px", height: "10px", background: "rgba(212, 175, 55, 0.85)" }}></div>
                </div>
                <span>Mais consistente</span>
              </div>
            </div>
          </div>

          {/* Coach de IA / Diagnóstico */}
          <div className="glass-card p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="ascend-title mb-0" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
                  Diagnóstico IA & Planejamento
                </h3>
                <span className="text-muted small">Crie análises evolutivas automáticas sobre seus treinos e saúde</span>
              </div>
              <div className="d-flex gap-2">
                <select
                  className="form-select bg-transparent text-white border-secondary form-select-sm"
                  style={{ width: "130px", fontSize: "0.8rem" }}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  disabled={loadingReport}
                >
                  <option value="SEMANAL" className="bg-dark text-white">Semanal</option>
                  <option value="MENSAL" className="bg-dark text-white">Mensal</option>
                  <option value="TREINO" className="bg-dark text-white">Musculação</option>
                </select>
                <button
                  className="btn btn-sm btn-ascend"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                >
                  {loadingReport ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1.5" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cpu me-1"></i> Diagnóstico
                    </>
                  )}
                </button>
              </div>
            </div>

            {statusMsg && (
              <div className="alert alert-info py-2 px-3 small border-0 text-white-50 mb-3" style={{ background: "rgba(226,201,133,0.05)" }}>
                {statusMsg}
              </div>
            )}

            {/* Histórico de Relatórios */}
            {reports.length === 0 ? (
              <div className="text-center py-4 border rounded" style={{ border: "1px dashed rgba(226,201,133,0.1) !important" }}>
                <span className="bi bi-chat-left-dots text-muted display-6 d-block mb-2" />
                <span className="text-muted small">Você ainda não gerou diagnósticos de IA. Selecione o período acima e clique em Diagnóstico!</span>
              </div>
            ) : (
              <div className="accordion accordion-premium" id="accordionReports">
                {reports.map((rep, idx) => (
                  <div className="accordion-item mb-2" key={rep.id}>
                    <h2 className="accordion-header">
                      <button
                        className="accordion-button collapsed px-3 py-2 text-white bg-transparent small"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#rep-collapse-${rep.id}`}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <span>
                            <i className="bi bi-calendar-event me-2 text-warning"></i>
                            Relatório {rep.tipo} - {new Date(rep.criadoEm).toLocaleDateString("pt-BR")}
                          </span>
                          {rep.insights?.previsaoTdee && (
                            <span className="badge bg-secondary text-warning-50 small">
                              Est. TDEE: {rep.insights.previsaoTdee} kcal
                            </span>
                          )}
                        </div>
                      </button>
                    </h2>
                    <div id={`rep-collapse-${rep.id}`} className="accordion-collapse collapse" data-bs-parent="#accordionReports">
                      <div className="accordion-body p-3 border-top" style={{ borderColor: "rgba(226,201,133,0.1)" }}>
                        <div className="text-muted small mb-3" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5", fontSize: "0.85rem" }}>
                          {rep.conteudo}
                        </div>

                        {/* Insights rápidos formatados */}
                        {rep.insights && (
                          <div className="row g-2 mt-2 pt-2 border-top border-secondary">
                            <div className="col-md-6">
                              <span className="d-block text-success small fw-bold mb-1">✓ Pontos Fortes</span>
                              <ul className="ps-3 mb-0 text-muted small" style={{ fontSize: "0.78rem" }}>
                                {rep.insights.pontosFortes?.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="col-md-6">
                              <span className="d-block text-warning small fw-bold mb-1">⚠ Pontos de Melhoria</span>
                              <ul className="ps-3 mb-0 text-muted small" style={{ fontSize: "0.78rem" }}>
                                {rep.insights.melhorias?.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (Monitoramento Diário e Treinos) */}
        <div className="col-lg-5 col-md-12">
          
          {/* Foco Nutricional com Concentric SVG Activity Rings */}
          <div className="glass-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="ascend-title mb-0" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
                Ingestão Diária
              </h3>
              <button
                className="btn btn-sm btn-ascend-outline"
                onClick={() => setIsConfigMetaOpen(true)}
              >
                <i className="bi bi-gear"></i> Meta
              </button>
            </div>

            {/* Concentric rings SVG display */}
            <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap mb-4">
              <div
                className="position-relative d-flex align-items-center justify-content-center"
                style={{ width: "160px", height: "160px" }}
              >
                <svg className="calorie-ring-svg" width="160" height="160" viewBox="0 0 160 160">
                  {/* Circle 1: Calories (r=65, cx=80, cy=80) -> circumference = 408.4 */}
                  <circle className="ring-macro-bg" cx="80" cy="80" r="65" />
                  <circle
                    className="ring-macro-active"
                    cx="80"
                    cy="80"
                    r="65"
                    stroke="var(--gold-soft)"
                    style={{
                      strokeDasharray: "408.4",
                      strokeDashoffset: 408.4 - 408.4 * Math.min((nutrition.calorias_consumidas || 0) / (nutrition.calorias_meta || 2000), 1),
                    }}
                  />
                  
                  {/* Circle 2: Protein (r=51, cx=80, cy=80) -> circumference = 320.4 */}
                  <circle className="ring-macro-bg" cx="80" cy="80" r="51" />
                  <circle
                    className="ring-macro-active"
                    cx="80"
                    cy="80"
                    r="51"
                    stroke="#2ec4b6"
                    style={{
                      strokeDasharray: "320.4",
                      strokeDashoffset: 320.4 - 320.4 * Math.min((nutrition.proteina || 0) / proteinTarget, 1),
                    }}
                  />

                  {/* Circle 3: Carbs (r=37, cx=80, cy=80) -> circumference = 232.5 */}
                  <circle className="ring-macro-bg" cx="80" cy="80" r="37" />
                  <circle
                    className="ring-macro-active"
                    cx="80"
                    cy="80"
                    r="37"
                    stroke="#4b88be"
                    style={{
                      strokeDasharray: "232.5",
                      strokeDashoffset: 232.5 - 232.5 * Math.min((nutrition.carboidrato || 0) / carbTarget, 1),
                    }}
                  />

                  {/* Circle 4: Fat (r=23, cx=80, cy=80) -> circumference = 144.5 */}
                  <circle className="ring-macro-bg" cx="80" cy="80" r="23" />
                  <circle
                    className="ring-macro-active"
                    cx="80"
                    cy="80"
                    r="23"
                    stroke="#e76f51"
                    style={{
                      strokeDasharray: "144.5",
                      strokeDashoffset: 144.5 - 144.5 * Math.min((nutrition.gordura || 0) / fatTarget, 1),
                    }}
                  />
                </svg>

                {/* Display central de calorias */}
                <div
                  className="text-center position-absolute"
                  style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                >
                  <strong className="d-block gold-text" style={{ fontSize: "1.1rem" }}>
                    {nutrition.calorias_consumidas || 0}
                  </strong>
                  <span className="text-muted" style={{ fontSize: "0.62rem" }}>
                    / {nutrition.calorias_meta || 2000} kcal
                  </span>
                </div>
              </div>

              {/* Legenda dos Macros com porcentagens e cores */}
              <div className="flex-grow-1" style={{ minWidth: "150px" }}>
                {/* Proteína */}
                <div className="mb-2">
                  <div className="d-flex justify-content-between mb-0.5" style={{ fontSize: "0.78rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot" style={{ background: "#2ec4b6" }} />
                      Proteínas
                    </span>
                    <strong>{nutrition.proteina || 0}g / {proteinTarget}g</strong>
                  </div>
                  <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.03)" }}>
                    <div className="progress-bar" style={{ background: "#2ec4b6", width: `${Math.min(((nutrition.proteina || 0) / proteinTarget) * 100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Carboidratos */}
                <div className="mb-2">
                  <div className="d-flex justify-content-between mb-0.5" style={{ fontSize: "0.78rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot" style={{ background: "#4b88be" }} />
                      Carbos
                    </span>
                    <strong>{nutrition.carboidrato || 0}g / {carbTarget}g</strong>
                  </div>
                  <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.03)" }}>
                    <div className="progress-bar" style={{ background: "#4b88be", width: `${Math.min(((nutrition.carboidrato || 0) / carbTarget) * 100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Gorduras */}
                <div>
                  <div className="d-flex justify-content-between mb-0.5" style={{ fontSize: "0.78rem" }}>
                    <span className="text-muted">
                      <span className="macro-dot" style={{ background: "#e76f51" }} />
                      Gorduras
                    </span>
                    <strong>{nutrition.gordura || 0}g / {fatTarget}g</strong>
                  </div>
                  <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.03)" }}>
                    <div className="progress-bar" style={{ background: "#e76f51", width: `${Math.min(((nutrition.gordura || 0) / fatTarget) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick logger form (Express com IA) */}
            <div className="pt-3 border-top border-secondary">
              <span className="d-block text-muted small fw-bold mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                REGISTRO RÁPIDO COM IA
              </span>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control bg-transparent text-white border-secondary small"
                  placeholder="Ex: 3 ovos mexidos com 2 fatias de pão integral"
                  value={expressInput}
                  onChange={(e) => setExpressInput(e.target.value)}
                  disabled={isExpressLoading}
                  style={{ fontSize: "0.85rem" }}
                />
                <button
                  className="btn btn-outline-warning border-secondary text-warning"
                  type="button"
                  onClick={handleExpressMealParse}
                  disabled={isExpressLoading}
                >
                  {isExpressLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-magic" />}
                </button>
              </div>

              {expressError && (
                <div className="text-danger small mb-2" style={{ fontSize: "0.75rem" }}>
                  {expressError}
                </div>
              )}

              {/* Form de macro inputs controlado */}
              <form onSubmit={handleQuickAdd}>
                <div className="row g-2 mb-3">
                  <div className="col-3">
                    <label className="form-label text-muted small mb-0.5">Kcal</label>
                    <input
                      type="number"
                      className="form-control bg-transparent text-white border-secondary text-center form-control-sm"
                      value={caloriesInput}
                      onChange={(e) => setCaloriesInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-3">
                    <label className="form-label text-muted small mb-0.5">Prot(g)</label>
                    <input
                      type="number"
                      className="form-control bg-transparent text-white border-secondary text-center form-control-sm"
                      value={proteinInput}
                      onChange={(e) => setProteinInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-3">
                    <label className="form-label text-muted small mb-0.5">Carb(g)</label>
                    <input
                      type="number"
                      className="form-control bg-transparent text-white border-secondary text-center form-control-sm"
                      value={carbsInput}
                      onChange={(e) => setCarbsInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-3">
                    <label className="form-label text-muted small mb-0.5">Gord(g)</label>
                    <input
                      type="number"
                      className="form-control bg-transparent text-white border-secondary text-center form-control-sm"
                      value={fatInput}
                      onChange={(e) => setFatInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-xs btn-ascend w-100">
                  <i className="bi bi-plus-lg me-1"></i> Registrar Alimentos
                </button>
              </form>
            </div>
          </div>

          {/* Controle de Hidratação */}
          <div className="glass-card p-4 mb-4">
            <h3 className="ascend-title mb-1" style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
              Controle de Hidratação
            </h3>
            <span className="text-muted small d-block mb-3">Sua meta diária estimada: {waterGoal} ml d'água</span>

            <div className="d-flex align-items-center justify-content-between gap-4">
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ascend-outline"
                  onClick={() => handleAddWater(300)}
                >
                  +300 ml
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ascend-outline"
                  onClick={() => handleAddWater(500)}
                >
                  +500 ml
                </button>
                <button
                  className="btn btn-sm btn-ascend"
                  onClick={() => handleAddWater(1000)}
                >
                  +1.0L 💧
                </button>
              </div>
              <div className="text-end">
                <strong className="fs-3 blue-text animate-pulse d-block">
                  {agua}
                </strong>
                <span className="text-muted small">
                  de {waterGoal} ml
                </span>
              </div>
            </div>
            <div className="progress mt-3" style={{ height: "6px", background: "rgba(255,255,255,0.03)" }}>
              <div
                className="progress-bar bg-info"
                role="progressbar"
                style={{ width: `${Math.min((agua / waterGoal) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Atividades e Fichas de Treino */}
          <div className="glass-card p-4 mt-4">
            <div className="mb-3">
              <span className="d-block text-muted small mb-2" style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px" }}>
                CRONOGRAMA DE ATIVIDADES
              </span>
              <div className="d-flex flex-wrap gap-1 bg-transparent p-1 rounded border border-secondary">
                {dbDiasAbrev.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayTab(day)}
                    className={`btn btn-xs flex-grow-1 py-1.5 px-0 ${selectedDayTab === day ? "btn-ascend" : "btn-link text-white text-decoration-none"}`}
                    style={{ minWidth: "35px", fontSize: "0.73rem", fontWeight: 700 }}
                  >
                    {day}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedDayTab("Todos")}
                  className={`btn btn-xs py-1.5 px-2.5 ${selectedDayTab === "Todos" ? "btn-ascend" : "btn-link text-white text-decoration-none"}`}
                  style={{ fontSize: "0.73rem", fontWeight: 700 }}
                >
                  Tudo
                </button>
              </div>
            </div>

            <h3 className="ascend-title mb-3" style={{ fontSize: "1.1rem", color: "var(--cream)" }}>
              {selectedDayTab === "Todos" ? "Rotinas Planejadas" : `Treinos para ${dbDiasNomesCompletos[selectedDayTab]}`}
            </h3>

            {activeWorkouts.length === 0 ? (
              <div className="text-center py-4 border rounded" style={{ border: "1px dashed rgba(226,201,133,0.1) !important" }}>
                <span className="bi bi-calendar-check text-muted display-6 mb-2 d-block" />
                <h4 className="ascend-title mb-1" style={{ fontSize: "0.92rem" }}>Descanso & Recuperação</h4>
                <p className="text-muted small mb-0" style={{ fontSize: "0.78rem" }}>Nenhuma rotina para hoje. Foco no repouso! 🧘‍♂️</p>
              </div>
            ) : (
              <div className="accordion accordion-premium" id="accordionTreinos">
                {activeWorkouts.map((workout) => (
                  <div className="accordion-item mb-2.5" key={workout.id}>
                    <h2 className="accordion-header" id={`heading-${workout.id}`}>
                      <button
                        className="accordion-button collapsed px-3 py-2.5 text-white bg-transparent"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${workout.id}`}
                        style={{ fontSize: "0.9rem" }}
                      >
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <div>
                            <strong className="d-block" style={{ color: "var(--cream)" }}>{workout.nome}</strong>
                            <span className="text-muted small" style={{ fontSize: "0.7rem" }}>
                              {workout.conteudo ? "Cardio / Outros" : "Musculação"}
                            </span>
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div id={`collapse-${workout.id}`} className="accordion-collapse collapse" data-bs-parent="#accordionTreinos">
                      <div className="accordion-body p-3.5 border-top" style={{ borderColor: "rgba(226,201,133,0.1)" }}>
                        {workout.conteudo ? (
                          <div className="mb-3">
                            <span className="d-block text-muted small mb-1" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                              DIRETRIZES DA ROTINA
                            </span>
                            <div className="p-2.5 rounded mb-3 small" style={{ background: "rgba(226,201,133,0.03)", border: "1px solid rgba(226,201,133,0.1)", whiteSpace: "pre-wrap", color: "#f3ead8" }}>
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
                                Concluir Atividade
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {workout.exercises.length === 0 ? (
                              <div className="text-center py-3 text-muted small">
                                Nenhum exercício cadastrado. Clique abaixo para iniciar!
                              </div>
                            ) : (
                              <div className="table-responsive mb-3">
                                <table className="table table-sm table-dark table-hover mb-0" style={{ fontSize: "0.8rem" }}>
                                  <thead>
                                    <tr>
                                      <th>Exercício</th>
                                      <th className="text-center">Séries</th>
                                      <th className="text-center">Reps</th>
                                      <th className="text-end">Carga</th>
                                      <th className="text-center">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {workout.exercises.map((ex) => (
                                      <tr key={ex.id}>
                                        <td className="align-middle fw-bold">{ex.nome_exercicio}</td>
                                        <td className="align-middle text-center">{ex.series}</td>
                                        <td className="align-middle text-center">{ex.repeticoes}</td>
                                        <td className="align-middle text-end text-success fw-bold">{ex.carga_atual} kg</td>
                                        <td className="align-middle text-center">
                                          <div className="d-flex gap-1.5 justify-content-center">
                                            <button
                                              className="btn btn-link text-warning p-0"
                                              onClick={() => openHistoryChart(ex)}
                                              title="Histórico de Cargas"
                                            >
                                              <span className="bi bi-graph-up" />
                                            </button>
                                            <form onSubmit={(e) => handleDeleteExercise(e, workout.id, ex.id)} style={{ display: "inline" }}>
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
                            )}
                            <div className="d-flex justify-content-between align-items-center">
                              <button
                                className="btn btn-sm btn-ascend-outline"
                                onClick={() => {
                                  setExerciseModalTab("individual");
                                  setActiveExerciseWorkoutId(workout.id);
                                }}
                              >
                                + Adicionar Exercício
                              </button>
                              <div className="d-flex gap-1.5">
                                <form onSubmit={(e) => handleDeleteWorkout(e, workout.id)}>
                                  <button type="submit" className="btn btn-sm btn-outline-danger">
                                    Excluir Ficha
                                  </button>
                                </form>
                                <button
                                  className="btn btn-sm btn-ascend"
                                  onClick={() => handleConcluirTreino(workout.id)}
                                >
                                  Concluir Treino
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico de Treinos Recentes */}
            {workoutLogs && workoutLogs.length > 0 && (
              <div className="mt-4 pt-3 border-top border-secondary">
                <span className="d-block text-muted small mb-2" style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px", color: "var(--cream)" }}>
                  ÚLTIMOS TREINOS CONCLUÍDOS
                </span>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {workoutLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <strong className="text-white small d-block">{log.workout_nome}</strong>
                        <span className="text-muted" style={{ fontSize: "0.68rem" }}>
                          {new Date(log.data_conclusao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="badge bg-transparent text-warning border border-warning-subtle" style={{ fontSize: "0.65rem" }}>
                        Concluído
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registrar Treino via Texto (IA) */}
            <div
              className="mt-3 p-3 rounded"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(226,201,133,0.15)",
                boxShadow: isWorkoutLoading ? "0 0 15px rgba(212, 175, 55, 0.25)" : "none",
                transition: "box-shadow 0.3s ease-in-out"
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-1.5">
                <span className="text-warning small fw-bold d-flex align-items-center gap-1.5" style={{ fontSize: "0.78rem", textTransform: "uppercase" }}>
                  <i className="bi bi-sparkles"></i> Registrar Treino via Texto (IA)
                </span>
                <span className="badge bg-black text-warning border border-secondary" style={{ fontSize: "0.65rem" }}>
                  +30 XP ⚡
                </span>
              </div>
              
              <div className="mb-2">
                <textarea
                  className="form-control bg-transparent text-white border-secondary small"
                  style={{ height: "65px", fontSize: "0.8rem" }}
                  placeholder="Ex: Treinei Peito hoje. Fiz Supino Reto: 4x10 com 60kg, Crucifixo Inclinado: 4x8 com 20kg"
                  value={workoutTextInput}
                  onChange={(e) => setWorkoutTextInput(e.target.value)}
                  disabled={isWorkoutLoading}
                ></textarea>
                {workoutError && (
                  <div className="text-danger small mt-1" style={{ fontSize: "0.72rem" }}>
                    {workoutError}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-xs btn-ascend w-100 d-flex align-items-center justify-content-center gap-1.5"
                onClick={handleExpressWorkoutRegister}
                disabled={isWorkoutLoading}
                style={{ minHeight: "32px" }}
              >
                <i className="bi bi-magic"></i>
                {isWorkoutLoading ? "IA Analisando..." : "Registrar com IA"}
              </button>
            </div>
          </div>
        </div> {/* closes col-lg-5 */}
      </div> {/* closes row */}


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
                      ></textarea>
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
                      ></textarea>
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
                        ></textarea>
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
