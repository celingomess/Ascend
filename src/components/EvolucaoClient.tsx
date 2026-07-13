"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { generateHealthReportAction } from "@/app/saude/actions";
import { ArrowLeft, Brain, Calendar, TrendingUp, Zap, CheckCircle2, AlertCircle } from "lucide-react";

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

interface WorkoutLogPoint {
  id: number;
  dataConclusao: string;
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

interface EvolucaoClientProps {
  initialWeights: WeightPoint[];
  initialNutritions: NutritionPoint[];
  initialWorkoutLogs: WorkoutLogPoint[];
  initialLoadHistory: LoadPoint[];
  initialReports: AIReport[];
  currentWeight: number;
}

export default function EvolucaoClient({
  initialWeights,
  initialNutritions,
  initialWorkoutLogs,
  initialLoadHistory,
  initialReports,
  currentWeight,
}: EvolucaoClientProps) {
  const [reports, setReports] = useState<AIReport[]>(initialReports);
  const [activeTab, setActiveTab] = useState<"graficos" | "IA">("graficos");
  const [reportType, setReportType] = useState<"SEMANAL" | "MENSAL" | "TREINO">("SEMANAL");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // State para o ponto do gráfico atualmente sob hover
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
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const compStr = d.toISOString().split("T")[0];

      // Encontrar peso mais próximo registrado
      const weightRecord = [...initialWeights]
        .reverse()
        .find(w => w.dataRegistro.split("T")[0] <= compStr);
      const peso = weightRecord ? weightRecord.peso : currentWeight;

      // Calcular volume de carga total desse dia
      const loadForDay = initialLoadHistory
        .filter(lh => lh.dataRegistro.split("T")[0] === compStr)
        .reduce((sum, curr) => sum + curr.carga, 0);

      dataPoints.push({
        label: dateStr,
        peso,
        volumeCarga: loadForDay || 0,
      });
    }
    return dataPoints;
  }, [initialWeights, initialLoadHistory, currentWeight]);

  // Coordenadas SVG e Normalizações
  const svgPaths = useMemo(() => {
    const width = 600;
    const height = 250;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

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

    // Construção das áreas fechadas para efeito de gradiente de preenchimento
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
  }, [chartData, currentWeight]);

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
      const dateKey = d.toISOString().split("T")[0];

      // Critério 1: Bateu macros (calorias)
      const nutrition = initialNutritions.find(n => n.data.split("T")[0] === dateKey);
      const bateuCalorias = nutrition ? (nutrition.caloriasConsumidas >= nutrition.caloriasMeta) : false;

      // Critério 2: Bateu água (>= 2 litros)
      const bateuAgua = nutrition ? (nutrition.aguaMl >= 2000) : false;

      // Critério 3: Treinou
      const treinou = initialWorkoutLogs.some(wl => wl.dataConclusao.split("T")[0] === dateKey);

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
  }, [initialNutritions, initialWorkoutLogs]);

  // Gerar relatório por IA
  const handleGenerateReport = async () => {
    setLoading(true);
    setStatusMsg("Analisando registros de saúde, cargas e evolução...");
    const res = await generateHealthReportAction(reportType);
    setLoading(false);
    if (res.success) {
      window.location.reload();
    } else {
      setStatusMsg("Erro: " + res.message);
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <Link href="/saude" className="btn btn-outline-secondary border-secondary text-white rounded-circle p-2 d-inline-flex align-items-center justify-content-center" style={{ width: "42px", height: "42px" }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="h3 mb-0 text-warning gold-text" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "1px" }}>
              Ecossistema de Evolução
            </h1>
            <p className="text-muted small mb-0">Mapeamento analítico e inteligência comportamental</p>
          </div>
        </div>

        {/* Abas */}
        <div className="d-flex gap-2 bg-black bg-opacity-50 p-1 rounded-3 border border-secondary">
          <button
            onClick={() => setActiveTab("graficos")}
            className={`btn btn-sm px-3 py-1.5 rounded-2 transition-all ${activeTab === "graficos" ? "btn-ascend" : "text-muted bg-transparent border-0"}`}
          >
            <TrendingUp size={16} className="me-2 d-inline" />
            Consistência & Carga
          </button>
          <button
            onClick={() => setActiveTab("IA")}
            className={`btn btn-sm px-3 py-1.5 rounded-2 transition-all ${activeTab === "IA" ? "btn-ascend" : "text-muted bg-transparent border-0"}`}
          >
            <Brain size={16} className="me-2 d-inline" />
            Diagnóstico IA
          </button>
        </div>
      </div>

      {activeTab === "graficos" && (
        <div className="row g-4">
          {/* Mapa de Calor */}
          <div className="col-12">
            <div className="card border border-secondary text-white p-4 rounded-4 shadow-lg" style={{ background: "rgba(10,18,12,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Calendar className="text-warning" size={20} />
                <h3 className="h5 mb-0 text-warning" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Mapa de Consistência (Últimos 6 meses)
                </h3>
              </div>
              <p className="text-muted small mb-4">
                Quadradinhos <span className="text-warning fw-bold">Dourados Brilhantes</span> representam dias perfeitos (Água + Macros + Treino cumpridos simultaneamente).
              </p>

              {/* Grid do Heatmap */}
              <div className="d-flex flex-wrap gap-1 bg-black bg-opacity-30 p-3 rounded-3 border border-secondary overflow-auto" style={{ maxHeight: "250px" }}>
                {heatmapData.map((day, idx) => {
                  let color = "rgba(255, 255, 255, 0.05)";
                  let shadow = "none";
                  
                  if (day.score === 3) {
                    color = "var(--gold)";
                    shadow = "0 0 8px rgba(212, 175, 55, 0.8)";
                  } else if (day.score === 2) {
                    color = "rgba(212, 175, 55, 0.65)";
                  } else if (day.score === 1) {
                    color = "rgba(212, 175, 55, 0.3)";
                  }

                  return (
                    <div
                      key={idx}
                      title={`${day.date}: ${day.details}`}
                      className="rounded-1 transition-all"
                      style={{
                        width: "14px",
                        height: "14px",
                        backgroundColor: color,
                        boxShadow: shadow,
                        cursor: "pointer",
                      }}
                    />
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="d-flex flex-wrap gap-4 mt-3 pt-2 border-top border-secondary text-muted small">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-1" style={{ width: "12px", height: "12px", backgroundColor: "rgba(255, 255, 255, 0.05)" }} />
                  <span>Sem Registros / Inativo</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-1" style={{ width: "12px", height: "12px", backgroundColor: "rgba(212, 175, 55, 0.3)" }} />
                  <span>Hábitos Parciais (1/3)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-1" style={{ width: "12px", height: "12px", backgroundColor: "rgba(212, 175, 55, 0.65)" }} />
                  <span>Consistência Moderada (2/3)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-1" style={{ width: "12px", height: "12px", backgroundColor: "var(--gold)", boxShadow: "0 0 6px rgba(212, 175, 55, 0.8)" }} />
                  <span>Dia Perfeito (3/3)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico Duplo Eixo */}
          <div className="col-12">
            <div className="card border border-secondary text-white p-4 rounded-4 shadow-lg position-relative" style={{ background: "rgba(10,18,12,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <TrendingUp className="text-warning" size={20} />
                <h3 className="h5 mb-0 text-warning" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Evolução Temporal: Peso vs. Volume de Carga (Últimos 30 dias)
                </h3>
              </div>
              <p className="text-muted small mb-4">
                Passe o cursor sobre o gráfico para ver os dados detalhados de evolução diária.
              </p>

              {/* Tooltip interativo */}
              {hoveredPoint && (
                <div
                  className="position-absolute p-2.5 rounded-3 border border-secondary text-white shadow-lg pointer-events-none fade-in-up"
                  style={{
                    left: `${(hoveredPoint.x / 600) * 100}%`,
                    top: "100px",
                    transform: "translateX(-50%)",
                    background: "rgba(7, 17, 12, 0.95)",
                    backdropFilter: "blur(6px)",
                    zIndex: 10,
                    minWidth: "150px",
                    borderLeft: "4px solid var(--gold)",
                  }}
                >
                  <div className="small text-warning fw-bold mb-1">{hoveredPoint.label}</div>
                  <div className="small d-flex justify-content-between">
                    <span className="text-muted">Peso:</span>
                    <strong className="text-white">{hoveredPoint.peso.toFixed(1)} kg</strong>
                  </div>
                  <div className="small d-flex justify-content-between">
                    <span className="text-muted">Volume Carga:</span>
                    <strong className="text-white">{hoveredPoint.volumeCarga.toFixed(0)} kg</strong>
                  </div>
                </div>
              )}

              {/* Canvas SVG do Gráfico */}
              <div className="position-relative overflow-auto">
                <svg viewBox="0 0 600 250" className="w-100 h-auto" style={{ minWidth: "500px" }}>
                  {/* Definições de Gradientes Premium */}
                  <defs>
                    <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="cargaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#AA7C11" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#AA7C11" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines Horizontais e Verticais */}
                  <line x1="40" y1="40" x2="560" y2="40" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="125" x2="560" y2="125" stroke="rgba(255,255,255,0.06)" />
                  <line x1="40" y1="210" x2="560" y2="210" stroke="rgba(255,255,255,0.06)" />

                  {/* Preenchimentos em Gradiente de Área */}
                  {svgPaths.pesoFillPoints && (
                    <path d={svgPaths.pesoFillPoints} fill="url(#pesoGrad)" />
                  )}
                  {svgPaths.cargaFillPoints && (
                    <path d={svgPaths.cargaFillPoints} fill="url(#cargaGrad)" />
                  )}

                  {/* Linha de Traçado do Peso */}
                  {svgPaths.pesoPoints && (
                    <path
                      d={svgPaths.pesoPoints}
                      fill="none"
                      stroke="var(--gold)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Linha de Traçado de Carga */}
                  {svgPaths.cargaPoints && (
                    <path
                      d={svgPaths.cargaPoints}
                      fill="none"
                      stroke="rgba(212, 175, 55, 0.45)"
                      strokeWidth="2.5"
                      strokeDasharray="4,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Linha guia vertical sob hover */}
                  {hoveredPoint && (
                    <line
                      x1={hoveredPoint.x}
                      y1="40"
                      x2={hoveredPoint.x}
                      y2="210"
                      stroke="rgba(212, 175, 55, 0.3)"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                  )}

                  {/* Pontos fixos nos intervalos das curvas */}
                  {chartData.map((pt, i) => {
                    const x = svgPaths.getX(i);
                    const yPeso = svgPaths.getY(pt.peso, svgPaths.minPeso, svgPaths.maxPeso);
                    const yCarga = svgPaths.getY(pt.volumeCarga, svgPaths.minCarga, svgPaths.maxCarga);
                    const showCargaNode = pt.volumeCarga > 0;
                    
                    return (
                      <g key={i}>
                        {i % 4 === 0 && (
                          <circle cx={x} cy={yPeso} r="4" fill="var(--gold)" />
                        )}
                        {showCargaNode && (
                          <circle cx={x} cy={yCarga} r="4" fill="#AA7C11" />
                        )}
                      </g>
                    );
                  })}

                  {/* Círculos interativos que acompanham o hover */}
                  {hoveredPoint && (
                    <g>
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.yPeso}
                        r="6"
                        fill="var(--gold)"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.yCarga}
                        r="6"
                        fill="#AA7C11"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Eixo e Legendas */}
                  <text x="15" y="30" fill="var(--gold-soft)" fontSize="10" textAnchor="middle">KG</text>
                  <text x="585" y="30" fill="rgba(212, 175, 55, 0.65)" fontSize="10" textAnchor="middle">Carga</text>

                  {/* Fatias Invisíveis para Gatilho de Hover */}
                  {chartData.map((pt, i) => {
                    const x = svgPaths.getX(i);
                    const yPeso = svgPaths.getY(pt.peso, svgPaths.minPeso, svgPaths.maxPeso);
                    const yCarga = svgPaths.getY(pt.volumeCarga, svgPaths.minCarga, svgPaths.maxCarga);
                    const sliceWidth = svgPaths.chartWidth / (chartData.length - 1);

                    return (
                      <rect
                        key={i}
                        x={x - sliceWidth / 2}
                        y="40"
                        width={sliceWidth}
                        height="170"
                        fill="transparent"
                        style={{ cursor: "crosshair" }}
                        onMouseEnter={() => setHoveredPoint({
                          x,
                          yPeso,
                          yCarga,
                          label: pt.label,
                          peso: pt.peso,
                          volumeCarga: pt.volumeCarga
                        })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="d-flex justify-content-center gap-4 mt-3 text-muted small">
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: "20px", height: "3px", backgroundColor: "var(--gold)" }} />
                  <span>Peso Corporal (Eixo Esquerdo)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: "20px", height: "3px", borderTop: "3px dashed rgba(212, 175, 55, 0.6)" }} />
                  <span>Volume de Cargas Acumuladas (Eixo Direito)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "IA" && (
        <div className="row g-4">
          {/* Seção de Geração */}
          <div className="col-md-4">
            <div className="card border border-secondary text-white p-4 rounded-4 shadow-lg h-100" style={{ background: "rgba(10,18,12,0.85)", backdropFilter: "blur(8px)" }}>
              <h3 className="h5 text-warning mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Solicitar Coach Pessoal
              </h3>
              <p className="text-muted small mb-4">
                Nossa inteligência artificial analisará seus logs de alimentação, hidratação, peso e treinos para dar feedbacks comportamentais.
              </p>

              <div className="mb-3">
                <label className="form-label text-muted small mb-1">Período / Tipo de Análise</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="form-select bg-dark text-white border-secondary"
                >
                  <option value="SEMANAL">Últimos 7 Dias (Semanal)</option>
                  <option value="MENSAL">Últimos 30 Dias (Mensal)</option>
                  <option value="TREINO">Relatório de Cargas & Musculação</option>
                </select>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="btn btn-ascend w-100 mt-4 d-flex align-items-center justify-content-center gap-2"
                style={{ minHeight: "48px" }}
              >
                <Brain size={18} />
                {loading ? "Processando..." : "Gerar Diagnóstico"}
              </button>

              {statusMsg && (
                <div className="alert alert-info py-2 px-3 small border-0 mt-3" style={{ background: "rgba(13,110,253,0.12)", color: "#9ec5fe" }}>
                  {statusMsg}
                </div>
              )}
            </div>
          </div>

          {/* Exibição do Último Relatório */}
          <div className="col-md-8">
            <div className="card border border-secondary text-white p-4 rounded-4 shadow-lg h-100" style={{ background: "rgba(10,18,12,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="d-flex align-items-center justify-content-between border-bottom border-secondary pb-3 mb-4">
                <h3 className="h5 text-warning mb-0" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Análise e Relatório Mais Recente
                </h3>
                {reports.length > 0 && (
                  <span className="badge bg-black border border-secondary text-muted small py-1 px-2.5">
                    Gerado em: {new Date(reports[0].criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <Brain size={48} className="mx-auto mb-3 opacity-30 text-warning" />
                  <p className="mb-0">Nenhum relatório de evolução foi gerado ainda.</p>
                  <p className="small">Selecione o período e solicite seu primeiro diagnóstico ao lado.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {/* Cards de Métricas IA */}
                  <div className="col-12 col-sm-6">
                    <div className="card p-3 border-0 bg-success bg-opacity-10 text-success rounded-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <CheckCircle2 size={16} />
                        <h4 className="small fw-bold mb-0 text-uppercase">Pontos Fortes</h4>
                      </div>
                      <ul className="ps-3 mb-0 small text-light">
                        {reports[0].insights?.pontosFortes?.map((p, idx) => (
                          <li key={idx} className="mb-1">{p}</li>
                        )) || <li>Consistência geral mantida.</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="card p-3 border-0 bg-danger bg-opacity-10 text-danger rounded-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <AlertCircle size={16} />
                        <h4 className="small fw-bold mb-0 text-uppercase">Melhorias Recomendadas</h4>
                      </div>
                      <ul className="ps-3 mb-0 small text-light">
                        {reports[0].insights?.melhorias?.map((m, idx) => (
                          <li key={idx} className="mb-1">{m}</li>
                        )) || <li>Nenhum ponto crítico detectado.</li>}
                      </ul>
                    </div>
                  </div>

                  {reports[0].insights?.previsaoTdee && (
                    <div className="col-12 mt-3">
                      <div className="card p-3 border border-secondary bg-black bg-opacity-40 rounded-3 d-flex flex-row align-items-center justify-content-between">
                        <div>
                          <h4 className="small text-muted mb-0">Previsão Dinâmica de Gasto Energético (TDEE)</h4>
                          <p className="text-warning h5 mb-0 fw-bold">{reports[0].insights.previsaoTdee} kcal</p>
                        </div>
                        <Zap className="text-warning opacity-75" size={24} />
                      </div>
                    </div>
                  )}

                  {/* Conteúdo MD */}
                  <div className="col-12 mt-4 pt-3 border-top border-secondary">
                    <div className="markdown-content text-light small lh-lg" style={{ whiteSpace: "pre-line" }}>
                      {reports[0].conteudo}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
