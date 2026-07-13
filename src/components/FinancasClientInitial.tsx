"use client";

import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { addTransactionAction, deleteTransactionAction, saveBudgetAction, addRecurringAction, deleteRecurringAction } from "@/app/financas/actions";
import { useLevelUp } from "@/components/LevelUpContext";

import "@/styles/finance.css";

interface Transaction {
  id: number;
  user_id: number | null;
  valor: number | null;
  descricao: string | null;
  categoria: string | null;
  data: Date | null;
}

interface Budget {
  id: number;
  user_id: number;
  categoria: string;
  limite: number;
}

interface Recurring {
  id: number;
  user_id: number;
  valor: number;
  descricao: string;
  categoria: string;
  dia_mes: number;
  ultimo_mes: Date | null;
}

interface FinancasClientInitialProps {
  user: {
    nome: string;
    nivel: number;
    xp_total: number;
  };
  initialTransactions: Transaction[];
  initialSaldoTotal: number;
  initialEntradasMes: number;
  initialSaidasMes: number;
  initialDadosCategorias: {
    labels: string[];
    valores: number[];
  };
  initialBudgets: Budget[];
  initialRecurrings: Recurring[];
}

export const FinancasClientInitial: React.FC<FinancasClientInitialProps> = ({
  user,
  initialTransactions,
  initialSaldoTotal,
  initialEntradasMes,
  initialSaidasMes,
  initialDadosCategorias,
  initialBudgets,
  initialRecurrings,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [saldoTotal, setSaldoTotal] = useState<number>(initialSaldoTotal);
  const [entradasMes, setEntradasMes] = useState<number>(initialEntradasMes);
  const [saidasMes, setSaidasMes] = useState<number>(initialSaidasMes);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [recurrings, setRecurrings] = useState<Recurring[]>(initialRecurrings);

  const [activeTab, setActiveTab] = useState<"extrato" | "orcamentos" | "recorrentes">("extrato");

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<string>("");

  const { triggerLevelUp } = useLevelUp();

  // Sincronizar estado cliente com as props atualizadas pelo servidor (revalidatePath)
  useEffect(() => {
    setTransactions(initialTransactions);
    setSaldoTotal(initialSaldoTotal);
    setEntradasMes(initialEntradasMes);
    setSaidasMes(initialSaidasMes);
    setBudgets(initialBudgets);
    setRecurrings(initialRecurrings);
  }, [initialTransactions, initialSaldoTotal, initialEntradasMes, initialSaidasMes, initialBudgets, initialRecurrings]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // Inicializar e gerenciar Chart.js
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Calcular dados de despesas por categorias atuais das transações ativas
    const categoriesMap: Record<string, number> = {};
    transactions.forEach((t) => {
      const v = t.valor ?? 0;
      if (v < 0) {
        const cat = t.categoria || "Outros";
        categoriesMap[cat] = (categoriesMap[cat] || 0) + Math.abs(v);
      }
    });

    const labels = Object.keys(categoriesMap);
    const valores = Object.values(categoriesMap);

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: valores,
            backgroundColor: [
              "rgba(180, 72, 72, 0.8)", // Alimentação
              "rgba(75, 116, 190, 0.8)", // Transporte
              "rgba(150, 96, 190, 0.8)", // Moradia
              "rgba(226, 201, 133, 0.8)", // Lazer
              "rgba(72, 180, 120, 0.8)", // Saúde
              "rgba(184, 122, 63, 0.8)", // Outros
            ],
            borderColor: "rgba(7, 17, 12, 0.95)",
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#a89f91",
              font: { size: 10, family: "Manrope" },
              boxWidth: 8,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [transactions]);

  // Configurar data padrão como hoje no carregamento
  useEffect(() => {
    const dataInput = document.getElementById("manual-data") as HTMLInputElement;
    if (dataInput) {
      const hoje = new Date();
      dataInput.value = hoje.toISOString().split("T")[0];
    }
  }, []);

  // Enviar Log Rápido
  const handleQuickLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await addTransactionAction(formData);
      if (res.success) {
        // Efeito sonoro de caixa registradora (playCash)
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          const sfx = (window as any).AscendSFX;
          if (typeof sfx.playCash === "function") {
            sfx.playCash();
          } else {
            sfx.playClick();
          }
        }

        if (res.nivelSubiu) {
          triggerLevelUp(res.nivelAnterior!, res.nivelNovo!);
        }
        form.reset();
      } else {
        alert("Erro ao gravar: " + res.message);
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  // Enviar Log Manual
  const handleManualLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await addTransactionAction(formData);
      if (res.success) {
        // Efeito sonoro de caixa registradora (playCash)
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          const sfx = (window as any).AscendSFX;
          if (typeof sfx.playCash === "function") {
            sfx.playCash();
          } else {
            sfx.playClick();
          }
        }

        if (res.nivelSubiu) {
          triggerLevelUp(res.nivelAnterior!, res.nivelNovo!);
        }
        form.reset();
        const dataInput = document.getElementById("manual-data") as HTMLInputElement;
        if (dataInput) {
          dataInput.value = new Date().toISOString().split("T")[0];
        }
      } else {
        alert("Erro ao gravar: " + res.message);
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingLimit) return;
    const limitVal = parseFloat(editingLimit);
    if (isNaN(limitVal) || limitVal < 0) {
      alert("Por favor, digite um valor limite válido.");
      return;
    }

    const res = await saveBudgetAction(editingCategory, limitVal);
    if (res.success) {
      setEditingCategory(null);
      setEditingLimit("");
    } else {
      alert("Erro ao salvar orçamento: " + res.message);
    }
  };

  const handleAddRecurring = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await addRecurringAction(formData);
    if (res.success) {
      form.reset();
    } else {
      alert("Erro ao cadastrar despesa fixa: " + res.message);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (confirm("Deseja realmente excluir esta despesa fixa?")) {
      const res = await deleteRecurringAction(id);
      if (!res.success) {
        alert("Erro ao excluir: " + res.message);
      }
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge-old mb-2">
            <i className="bi bi-bank"></i> Evolução Patrimonial
          </span>
          <h2 className="ascend-title mb-0">Gestão Financeira</h2>
        </div>
      </div>

      {/* Indicadores no Topo */}
      <div className="row g-3 mb-4 fade-in-up">
        {/* Saldo */}
        <div className="col-md-4">
          <div className="ascend-card p-4 text-center d-flex flex-column justify-content-center h-100">
            <span
              className="text-muted small"
              style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "2px" }}
            >
              SALDO GLOBAL
            </span>
            <strong
              className={`display-6 mt-2 ${saldoTotal >= 0 ? "balance-positive" : "balance-negative"}`}
              id="lbl-saldo-total"
            >
              R$ {saldoTotal.toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Entradas */}
        <div className="col-md-4">
          <div className="ascend-card p-4 text-center d-flex flex-column justify-content-center h-100">
            <span
              className="text-muted small"
              style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "2px" }}
            >
              ENTRADAS (MÊS)
            </span>
            <strong className="display-6 mt-2 text-success" id="lbl-entradas-mes">
              R$ {entradasMes.toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Saídas */}
        <div className="col-md-4">
          <div className="ascend-card p-4 text-center d-flex flex-column justify-content-center h-100">
            <span
              className="text-muted small"
              style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "2px" }}
            >
              SAÍDAS (MÊS)
            </span>
            <strong className="display-6 mt-2 text-danger" id="lbl-saidas-mes">
              R$ {saidasMes.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* Layout Dividido */}
      <div className="row g-4 fade-in-up">
        {/* Formulários & Gráfico (Esquerda) */}
        <div className="col-lg-5 col-md-12">
          <div className="ascend-card p-4 mb-4">
            <h3 className="ascend-title mb-4" style={{ fontSize: "1.25rem" }}>
              Lançamento Rápido (IA Parser)
            </h3>

            {/* Quick Logger Form */}
            <form id="form-quick-log" onSubmit={handleQuickLog} className="mb-4">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-transparent text-white border-secondary"
                  name="quick_log"
                  placeholder="Ex: -32 Almoço ou +500 Venda"
                  required
                />
                <button className="btn btn-ascend" type="submit">
                  Gravar
                </button>
              </div>
              <small className="text-muted mt-2 d-block" style={{ fontSize: "0.75rem" }}>
                <i className="bi bi-info-circle"></i> O sistema detectará o valor, descrição e categoria
                automaticamente!
              </small>
            </form>

            <hr style={{ borderColor: "rgba(226,201,133,0.15)" }} />

            <h3 className="ascend-title my-4" style={{ fontSize: "1.25rem" }}>
              Distribuição de Gastos
            </h3>
            {/* Gráfico Chart.js */}
            <div className="chart-container position-relative" style={{ height: "220px", width: "100%" }}>
              <canvas ref={canvasRef} id="chartFinanceCategorias"></canvas>
            </div>
          </div>

          {/* Lançar Manualmente */}
          <div className="ascend-card p-4">
            <h3 className="ascend-title mb-4" style={{ fontSize: "1.25rem" }}>
              Lançar Manualmente
            </h3>
            <form id="form-manual-log" onSubmit={handleManualLog} className="row g-3">
              <div className="col-md-6">
                <label className="form-label text-muted">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control bg-transparent text-white border-secondary"
                  name="valor"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted">Tipo</label>
                <select className="form-select bg-dark text-white border-secondary" name="tipo">
                  <option value="saida">Saída / Despesa</option>
                  <option value="entrada">Entrada / Receita</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label text-muted">Descrição</label>
                <input
                  type="text"
                  className="form-control bg-transparent text-white border-secondary"
                  name="descricao"
                  placeholder="Ex: Assinatura Netflix"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted">Categoria</label>
                <select className="form-select bg-dark text-white border-secondary" name="categoria">
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Moradia">Moradia</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Investimentos">Investimentos</option>
                  <option value="Receita">Receita</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted">Data</label>
                <input
                  type="date"
                  className="form-control bg-transparent text-white border-secondary"
                  name="data"
                  id="manual-data"
                />
              </div>
              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-ascend w-100">
                  Registrar Transação
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Histórico Extrato (Direita) */}
        <div className="col-lg-7 col-md-12">
          <div className="ascend-card p-4 h-100 d-flex flex-column">
            
            {/* Abas Superiores e Ações */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <div className="d-flex gap-2">
                <button
                  className={`btn btn-sm ${activeTab === "extrato" ? "btn-ascend" : "btn-ascend-outline"}`}
                  onClick={() => setActiveTab("extrato")}
                  style={{ minHeight: "40px", minWidth: "100px" }}
                >
                  <i className="bi bi-receipt me-1" /> Extrato
                </button>
                <button
                  className={`btn btn-sm ${activeTab === "orcamentos" ? "btn-ascend" : "btn-ascend-outline"}`}
                  onClick={() => setActiveTab("orcamentos")}
                  style={{ minHeight: "40px", minWidth: "120px" }}
                >
                  <i className="bi bi-wallet2 me-1" /> Orçamentos
                </button>
                <button
                  className={`btn btn-sm ${activeTab === "recorrentes" ? "btn-ascend" : "btn-ascend-outline"}`}
                  onClick={() => setActiveTab("recorrentes")}
                  style={{ minHeight: "40px", minWidth: "130px" }}
                >
                  <i className="bi bi-arrow-repeat me-1" /> Despesas Fixas
                </button>
              </div>

              {activeTab === "extrato" && (
                <a
                  href="/financas/exportar"
                  className="btn btn-sm btn-outline-info d-inline-flex align-items-center justify-content-center"
                  style={{ minHeight: "40px", padding: "0 12px" }}
                  download
                >
                  <i className="bi bi-download me-1" /> Exportar CSV
                </a>
              )}
            </div>

            {/* Conteúdo da Aba: Extrato */}
            {activeTab === "extrato" && (
              <>
                <h3 className="ascend-title mb-4" style={{ fontSize: "1.25rem" }}>
                  Extrato de Evolução Financeira
                </h3>
                <div className="table-responsive">
                  <table
                    className="table table-borderless align-middle text-white mb-0"
                    style={{ fontSize: "0.92rem" }}
                  >
                    <thead>
                      <tr
                        className="text-muted border-bottom"
                        style={{ borderBottomColor: "rgba(226,201,133,0.15) !important" }}
                      >
                        <th style={{ width: "20%" }}>Data</th>
                        <th style={{ width: "40%" }}>Descrição</th>
                        <th style={{ width: "20%" }}>Categoria</th>
                        <th style={{ width: "20%" }} className="text-end">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody id="extrato-corpo">
                      {transactions.length === 0 ? (
                        <tr id="row-empty-state">
                          <td colSpan={4} className="text-center py-5 text-muted">
                            Nenhuma transação cadastrada.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => {
                          const isPositive = (t.valor ?? 0) > 0;
                          const dateObj = t.data ? new Date(t.data) : new Date();
                          const formattedDate = `${String(dateObj.getDate()).padStart(2, "0")}/${String(
                            dateObj.getMonth() + 1
                          ).padStart(2, "0")}/${dateObj.getFullYear()}`;

                          return (
                            <tr
                              className="border-bottom"
                              style={{ borderBottomColor: "rgba(255,255,255,0.02) !important" }}
                              key={t.id}
                            >
                              <td className="text-muted">{formattedDate}</td>
                              <td>
                                <strong className="d-block text-white">{t.descricao}</strong>
                              </td>
                              <td>
                                <span
                                  className="badge-old text-white"
                                  style={{ fontSize: "0.68rem", borderColor: "rgba(255,255,255,0.15)" }}
                                >
                                  {t.categoria}
                                </span>
                              </td>
                              <td className="text-end">
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <strong className={isPositive ? "text-success" : "text-danger"}>
                                    {isPositive ? "+" : ""}R$ {Math.abs(t.valor ?? 0).toFixed(2)}
                                  </strong>
                                  <button
                                    type="button"
                                    className="btn btn-link text-danger p-0 delete-btn"
                                    style={{ minWidth: "48px", minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                    onClick={async () => {
                                      if (confirm(`Deseja realmente deletar a transação "${t.descricao}"?`)) {
                                        const res = await deleteTransactionAction(t.id);
                                        if (!res.success) {
                                          alert("Erro ao deletar: " + res.message);
                                        }
                                      }
                                    }}
                                  >
                                    <span className="bi bi-trash" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Conteúdo da Aba: Orçamentos */}
            {activeTab === "orcamentos" && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="ascend-title mb-0" style={{ fontSize: "1.25rem" }}>
                    Limites e Orçamentos Mensais
                  </h3>
                  <small className="text-muted text-end">Mês Atual</small>
                </div>

                <div className="row g-3">
                  {["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Investimentos", "Outros"].map((cat) => {
                    const limitBudget = budgets.find((b) => b.categoria === cat);
                    const limite = limitBudget?.limite ?? 0;

                    // Calcular despesas atuais desse mês para essa categoria
                    const hojeDate = new Date();
                    const gastoMes = transactions
                      .filter((t) => {
                        if (!t.data || (t.valor ?? 0) >= 0 || t.categoria !== cat) return false;
                        const d = new Date(t.data);
                        return d.getMonth() === hojeDate.getMonth() && d.getFullYear() === hojeDate.getFullYear();
                      })
                      .reduce((acc, t) => acc + Math.abs(t.valor ?? 0), 0);

                    const percentage = limite > 0 ? (gastoMes / limite) * 100 : 0;
                    
                    // Decidir cor da barra
                    let progressColor = "bg-success";
                    let textColorClass = "text-success";
                    if (percentage >= 90) {
                      progressColor = "bg-danger";
                      textColorClass = "text-danger";
                    } else if (percentage >= 70) {
                      progressColor = "bg-warning";
                      textColorClass = "gold-text";
                    }

                    return (
                      <div className="col-12" key={cat}>
                        <div className="p-3 rounded border border-secondary mb-2" style={{ background: "rgba(255,255,255,0.01)" }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <strong className="text-white">{cat}</strong>
                              <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>
                                {limite > 0 ? (
                                  <>
                                    Gasto: R$ {gastoMes.toFixed(2)} / Limite: R$ {limite.toFixed(2)}
                                  </>
                                ) : (
                                  "Sem teto de gastos definido"
                                )}
                              </span>
                            </div>
                            <div className="text-end">
                              {limite > 0 && (
                                <strong className={`small d-block ${textColorClass}`}>
                                  {percentage.toFixed(0)}%
                                </strong>
                              )}
                              <button
                                type="button"
                                className="btn btn-link gold-text p-0 small text-decoration-none"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditingLimit(limite > 0 ? limite.toString() : "");
                                }}
                              >
                                {limite > 0 ? "Ajustar" : "Definir"}
                              </button>
                            </div>
                          </div>

                          {limite > 0 && (
                            <div className="progress" style={{ height: "6px", background: "rgba(255,255,255,0.05)" }}>
                              <div
                                className={`progress-bar ${progressColor}`}
                                role="progressbar"
                                style={{ width: `${Math.min(percentage, 100)}%`, transition: "width 0.5s ease" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {editingCategory && (
                  <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                      <form onSubmit={handleSaveBudget} className="modal-content text-white border border-secondary" style={{ background: "#111" }}>
                        <div className="modal-header border-bottom border-secondary px-4">
                          <h5 className="modal-title gold-text">
                            Definir Teto: {editingCategory}
                          </h5>
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={() => setEditingCategory(null)}
                          />
                        </div>
                        <div className="modal-body p-4">
                          <label className="form-label text-muted">Limite de Gastos Mensal (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control bg-transparent text-white border-secondary"
                            value={editingLimit}
                            onChange={(e) => setEditingLimit(e.target.value)}
                            placeholder="0.00"
                            required
                            autoFocus
                          />
                          <small className="text-muted mt-2 d-block">
                            Insira R$ 0 para remover o limite desta categoria.
                          </small>
                        </div>
                        <div className="modal-footer border-0 px-4 pb-4">
                          <button
                            type="button"
                            className="btn btn-secondary rounded-pill"
                            onClick={() => setEditingCategory(null)}
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="btn btn-ascend">
                            Salvar Teto
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Conteúdo da Aba: Despesas Recorrentes */}
            {activeTab === "recorrentes" && (
              <>
                <h3 className="ascend-title mb-4" style={{ fontSize: "1.25rem" }}>
                  Gerenciador de Despesas Fixas (Assinaturas)
                </h3>

                {/* Formulário Novo Recorrente */}
                <form onSubmit={handleAddRecurring} className="row g-3 mb-4 p-3 rounded border border-secondary" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <span className="gold-text fw-bold" style={{ fontSize: "0.82rem", letterSpacing: "1px" }}>
                    + NOVA DESPESA FIXA RECORRENTE
                  </span>
                  <div className="col-md-6">
                    <label className="form-label text-muted">Descrição</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-transparent text-white border-secondary"
                      name="descricao"
                      placeholder="Ex: Assinatura Spotify"
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-muted">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm bg-transparent text-white border-secondary"
                      name="valor"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-muted">Tipo</label>
                    <select className="form-select form-select-sm bg-dark text-white border-secondary" name="tipo">
                      <option value="saida">Saída / Despesa</option>
                      <option value="entrada">Entrada / Receita</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">Categoria</label>
                    <select className="form-select form-select-sm bg-dark text-white border-secondary" name="categoria">
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Moradia">Moradia</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Investimentos">Investimentos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-muted">Dia de Cobrança</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="form-control form-control-sm bg-transparent text-white border-secondary"
                      name="dia_mes"
                      placeholder="Dia (1-31)"
                      required
                    />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <button type="submit" className="btn btn-sm btn-ascend w-100" style={{ height: "38px" }}>
                      Salvar Assinatura
                    </button>
                  </div>
                </form>

                {/* Lista de Recorrentes */}
                <div className="table-responsive">
                  <table className="table table-borderless align-middle text-white mb-0" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr className="text-muted border-bottom" style={{ borderBottomColor: "rgba(255,255,255,0.05)" }}>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Dia</th>
                        <th className="text-end">Valor</th>
                        <th className="text-end" style={{ width: "50px" }}>Excluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurrings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted">
                            Nenhuma despesa fixa cadastrada.
                          </td>
                        </tr>
                      ) : (
                        recurrings.map((rec) => {
                          const isPos = rec.valor > 0;
                          return (
                            <tr key={rec.id} className="border-bottom" style={{ borderBottomColor: "rgba(255,255,255,0.02) !important" }}>
                              <td className="fw-bold">{rec.descricao}</td>
                              <td>
                                <span className="badge-old border-secondary text-white" style={{ fontSize: "0.68rem" }}>
                                  {rec.categoria}
                                </span>
                              </td>
                              <td>Todo dia {rec.dia_mes}</td>
                              <td className={`text-end fw-bold ${isPos ? "text-success" : "text-danger"}`}>
                                {isPos ? "+" : "-"}R$ {Math.abs(rec.valor).toFixed(2)}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0"
                                  onClick={() => handleDeleteRecurring(rec.id)}
                                >
                                  <i className="bi bi-trash" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancasClientInitial;
