"use client";

import React, { useState, useEffect } from "react";
import { generateProactiveBriefingAction } from "@/app/dashboard/proactiveActions";

export default function ProactiveCopilotCard() {
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<any>(null);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const res = await generateProactiveBriefingAction();
      if (res.success) {
        setBriefing(res.briefing);
      }
    } catch (err) {
      console.error("Erro ao carregar briefing do Copilot Proativo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <div
        className="p-4 mb-4 rounded-4 position-relative overflow-hidden"
        style={{
          background: "rgba(9, 18, 12, 0.85)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          boxShadow: "0 14px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="placeholder-glow w-50">
            <span className="placeholder col-8 bg-secondary rounded py-2"></span>
          </div>
          <div className="placeholder-glow w-25 text-end">
            <span className="placeholder col-6 bg-secondary rounded py-2"></span>
          </div>
        </div>
        <div className="placeholder-glow mb-2">
          <span className="placeholder col-12 bg-secondary rounded py-1.5 mb-1"></span>
          <span className="placeholder col-10 bg-secondary rounded py-1.5"></span>
        </div>
        <div className="d-flex gap-2 mt-3 placeholder-glow">
          <span className="placeholder col-3 bg-secondary rounded-pill py-2"></span>
          <span className="placeholder col-3 bg-secondary rounded-pill py-2"></span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div
      className="p-4 mb-4 rounded-4 position-relative overflow-hidden fade-in-up"
      style={{
        background: "radial-gradient(circle at top left, rgba(226,201,133,0.08), transparent 45%), rgba(9, 18, 12, 0.85)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
        boxShadow: "0 16px 50px rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-dark border border-secondary text-warning" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
              COPILOT PROATIVO 2.0
            </span>
            <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25" style={{ fontSize: "0.72rem" }}>
              {briefing.statusRank}
            </span>
          </div>
          <h3 className="ascend-title text-white mb-0" style={{ fontSize: "1.25rem", color: "var(--cream)" }}>
            {briefing.headline}
          </h3>
        </div>

        <button
          type="button"
          className="btn btn-xs btn-outline-secondary text-muted rounded-pill px-3"
          onClick={fetchBriefing}
          title="Recarregar Análise da IA"
        >
          Recarregar
        </button>
      </div>

      <p className="text-muted small mb-3" style={{ fontSize: "0.86rem", lineHeight: "1.6" }}>
        {briefing.conselho}
      </p>

      {/* Dica Chave do Dia */}
      <div
        className="p-2.5 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
        style={{ background: "rgba(226, 201, 133, 0.06)", border: "1px solid rgba(226, 201, 133, 0.15)" }}
      >
        <span className="text-warning-50 small fw-bold" style={{ fontSize: "0.8rem" }}>
          💡 Ação Recomendada: <span className="text-white fw-normal">{briefing.dicaChave}</span>
        </span>
      </div>

      {/* Métricas Resumidas em Pílulas */}
      <div className="d-flex gap-2 flex-wrap" style={{ fontSize: "0.74rem" }}>
        <div className="px-3 py-1 rounded-pill bg-dark border border-secondary text-muted">
          Consistência: <strong className="text-warning">{briefing.streak} dias</strong>
        </div>
        <div className="px-3 py-1 rounded-pill bg-dark border border-secondary text-muted">
          Ingestão vs. TDEE: <strong className="text-info">{briefing.caloriasIngeridas} / {briefing.tdeeEstimado} kcal</strong>
        </div>
        <div className="px-3 py-1 rounded-pill bg-dark border border-secondary text-muted">
          Saldo Financeiro Mês: <strong className={briefing.saldoMes >= 0 ? "text-success" : "text-danger"}>R$ {briefing.saldoMes.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
