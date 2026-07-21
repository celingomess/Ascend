"use client";

import React, { useState, useEffect, useRef } from "react";
import { salvarSessaoFocoAction, sugerirPrioridadesIaAction } from "@/app/foco/actions";
import { Play, Pause, RotateCcw, Sparkles, CheckCircle2, Flame, Award, Clock } from "lucide-react";
import "@/styles/foco.css";

interface FocoClientProps {
  user: {
    id: number;
    nome: string;
    nivel: number;
    xp_total: number;
  };
  initialSessions: any[];
}

export const FocoClient: React.FC<FocoClientProps> = ({ user, initialSessions }) => {
  const [phase, setPhase] = useState<"FOCO" | "PAUSA_CURTA" | "PAUSA_LONGA">("FOCO");
  const [duracaoMinutos, setDuracaoMinutos] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [combo, setCombo] = useState(0);
  const [categoria, setCategoria] = useState("Estudos");
  const [tituloTarefa, setTituloTarefa] = useState("");
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [prioridades, setPrioridades] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  const totalSeconds = duracaoMinutos * 60;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const strokeDashoffset = 565.48 * (1 - progressRatio);

  // Timer Tick Interval
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleCompleteSession();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Alternar Fases
  const handleSelectPhase = (newPhase: "FOCO" | "PAUSA_CURTA" | "PAUSA_LONGA", minutes: number) => {
    setIsRunning(false);
    setPhase(newPhase);
    setDuracaoMinutos(minutes);
    setTimeLeft(minutes * 60);
  };

  // Concluir Sessão
  const handleCompleteSession = async () => {
    setIsRunning(false);

    if (phase === "FOCO") {
      setStatusMsg("Salvando progresso e atribuindo XP...");
      const res = await salvarSessaoFocoAction({
        duracao_minutos: duracaoMinutos,
        categoria,
        titulo_tarefa: tituloTarefa || "Bloco de Foco Profundo",
        status: "CONCLUIDA",
      });

      if (res.success) {
        setCombo((prev) => prev + 1);
        setStatusMsg(`🎉 Parabéns! Sessão de foco concluída. +${res.xp_ganho} XP creditados!`);
        if (res.session) {
          setSessions((prev) => [res.session, ...prev]);
        }
      }
    } else {
      setStatusMsg("Pausa concluída! Pronto para o próximo ciclo de Foco?");
    }
  };

  // Interromper Sessão (Registro de desistência parcial como sugerido)
  const handleInterruptSession = async () => {
    if (!isRunning && timeLeft === totalSeconds) return;

    setIsRunning(false);
    const minutosDecorridos = Math.max(1, Math.round((totalSeconds - timeLeft) / 60));

    if (phase === "FOCO" && minutosDecorridos > 1) {
      await salvarSessaoFocoAction({
        duracao_minutos: minutosDecorridos,
        categoria,
        titulo_tarefa: tituloTarefa || "Bloco Interrompido",
        status: "INTERROMPIDA",
      });
      setStatusMsg("⚠️ Sessão registrada como INTERROMPIDA no histórico de disciplina.");
    }

    setTimeLeft(totalSeconds);
  };

  // Consultar IA Prioritizer
  const handleGerarPrioridadesIa = async () => {
    setLoadingPriorities(true);
    try {
      const res = await sugerirPrioridadesIaAction();
      if (res.success && res.prioridades) {
        setPrioridades(res.prioridades);
      } else {
        setStatusMsg(`⚠️ ${res.error || "Não foi possível carregar prioridades por IA."}`);
      }
    } catch (err) {
      setStatusMsg("⚠️ Erro ao consultar a IA.");
    } finally {
      setLoadingPriorities(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Horas totais de foco hoje
  const minutosFocoHoje = sessions
    .filter((s) => s.status === "CONCLUIDA")
    .reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);

  return (
    <div className="container-fluid py-4 fade-in-up">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <span className="badge-old mb-2" style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
            <Clock size={12} className="me-1 gold-text" /> Central de Produtividade
          </span>
          <h2 className="ascend-title mb-0" style={{ fontSize: "1.8rem" }}>
            Foco Profundo & Deep Work
          </h2>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="foco-combo-badge d-flex align-items-center gap-1">
            <Flame size={14} /> Combo de Foco: {combo}x
          </div>
          <div className="ascend-card px-3 py-1.5 d-flex align-items-center gap-2" style={{ borderRadius: "99px" }}>
            <Award size={16} className="gold-text" />
            <span className="small fw-bold">{minutosFocoHoje} min focados hoje</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* COLUNA ESQUERDA: TIMER POMODORO */}
        <div className="col-lg-7 col-md-12">
          <div className="foco-hero-card p-4 text-center position-relative">
            {/* Seletor de Fases */}
            <div className="d-flex justify-content-center gap-2 mb-4 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm ${phase === "FOCO" ? "foco-phase-pill" : "btn-outline-secondary text-muted"}`}
                onClick={() => handleSelectPhase("FOCO", 25)}
              >
                Foco (25 min)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${phase === "PAUSA_CURTA" ? "foco-phase-pill" : "btn-outline-secondary text-muted"}`}
                onClick={() => handleSelectPhase("PAUSA_CURTA", 5)}
              >
                Pausa Curta (5 min)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${phase === "PAUSA_LONGA" ? "foco-phase-pill" : "btn-outline-secondary text-muted"}`}
                onClick={() => handleSelectPhase("PAUSA_LONGA", 15)}
              >
                Pausa Longa (15 min)
              </button>
            </div>

            {/* Timer Anel SVG */}
            <div className="position-relative d-inline-block my-3">
              <svg width="240" height="240" viewBox="0 0 200 200" className="foco-ring-svg">
                <circle cx="100" cy="100" r="90" className="foco-ring-bg" />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  className="foco-ring-active"
                  style={{ strokeDasharray: 565.48, strokeDashoffset }}
                />
              </svg>
              <div
                className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center"
                style={{ zIndex: 2 }}
              >
                <span className="foco-timer-time">{formatTime(timeLeft)}</span>
                <span className="text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.75rem" }}>
                  {phase === "FOCO" ? "Foco Ativo" : "Pausa"}
                </span>
              </div>
            </div>

            {/* Configuração da Tarefa Atual */}
            <div className="row g-2 max-w-md mx-auto my-3 justify-content-center" style={{ maxWidth: "480px" }}>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary form-control-sm text-center"
                  placeholder="No que você vai focar agora?"
                  value={tituloTarefa}
                  onChange={(e) => setTituloTarefa(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select bg-dark text-white border-secondary form-select-sm"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Estudos">Estudos</option>
                  <option value="Carreira">Carreira</option>
                  <option value="Projetos">Projetos</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Pessoal">Pessoal</option>
                </select>
              </div>
            </div>

            {/* Botões de Controle */}
            <div className="d-flex justify-content-center gap-3 align-items-center mt-4">
              <button
                type="button"
                className="btn btn-foco-gold d-flex align-items-center gap-2"
                onClick={() => setIsRunning((prev) => !prev)}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                {isRunning ? "Pausar" : "Iniciar Foco"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary rounded-circle p-2.5"
                onClick={handleInterruptSession}
                title="Resetar / Interromper"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {statusMsg && (
              <div className="alert alert-info py-2 px-3 small border-0 text-white-50 mt-4 mb-0" style={{ background: "rgba(212,175,55,0.08)" }}>
                {statusMsg}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: IA TASK PRIORITIZER & HISTÓRICO */}
        <div className="col-lg-5 col-md-12">
          {/* Card de IA Prioritizer */}
          <div className="glass-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="ascend-title mb-0" style={{ fontSize: "1.15rem", color: "var(--cream)" }}>
                  IA Task Prioritizer
                </h3>
                <span className="text-muted small">Sugestões de alto impacto com Gemini 2.5</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ascend"
                onClick={handleGerarPrioridadesIa}
                disabled={loadingPriorities}
              >
                {loadingPriorities ? (
                  <span className="spinner-border spinner-border-sm me-1" />
                ) : (
                  <Sparkles size={14} className="me-1" />
                )}
                Recomendar
              </button>
            </div>

            {prioridades.length === 0 ? (
              <div className="text-center py-4 border rounded" style={{ border: "1px dashed rgba(212,175,55,0.15) !important" }}>
                <Sparkles size={24} className="text-muted mb-2 d-block mx-auto" />
                <span className="text-muted small">Clique no botão acima para a IA analisar suas metas ativas e indicar o melhor foco agora.</span>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {prioridades.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(212,175,55,0.2)" }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <strong className="text-white" style={{ fontSize: "0.9rem" }}>{item.titulo}</strong>
                      <span className="badge bg-dark border border-secondary text-warning" style={{ fontSize: "0.68rem" }}>
                        {item.categoria}
                      </span>
                    </div>
                    <p className="text-muted small mb-2" style={{ fontSize: "0.78rem" }}>{item.por_que}</p>
                    <button
                      type="button"
                      className="btn btn-xs btn-ascend-outline w-100 text-center"
                      onClick={() => {
                        setTituloTarefa(item.titulo);
                        if (item.categoria) setCategoria(item.categoria);
                      }}
                    >
                      Usar para este Timer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico Recente de Sessões */}
          <div className="glass-card p-4">
            <h3 className="ascend-title mb-3" style={{ fontSize: "1.15rem", color: "var(--cream)" }}>
              Sessões Recentes
            </h3>

            {sessions.length === 0 ? (
              <div className="text-center py-3 text-muted small">Nenhuma sessão concluída hoje.</div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: "240px", overflowY: "auto" }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="d-flex justify-content-between align-items-center p-2.5 rounded border"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)", fontSize: "0.82rem" }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircle2 size={16} className={s.status === "CONCLUIDA" ? "text-success" : "text-warning"} />
                      <div>
                        <div className="text-white fw-bold">{s.titulo_tarefa || s.categoria}</div>
                        <div className="text-muted small" style={{ fontSize: "0.7rem" }}>
                          {s.duracao_minutos} min &middot; {s.categoria}
                        </div>
                      </div>
                    </div>
                    <div>
                      {s.status === "CONCLUIDA" ? (
                        <span className="badge bg-success text-white">+{s.xp_ganho} XP</span>
                      ) : (
                        <span className="badge bg-secondary text-white-50">Interrompida</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocoClient;
