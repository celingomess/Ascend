"use client";

import React, { useState, useEffect, useRef } from "react";
import { processCopilotCommandAction } from "@/app/api/copilot/copilotActions";
import { Sparkles, X, Send, Command, Zap } from "lucide-react";
import "@/styles/copilot.css";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  actionExecuted?: string;
}

export const AiCopilotDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Olá! Sou o **Ascend AI Copilot**. Como posso impulsionar sua evolução ou registrar dados hoje?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao receber mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Atalho de teclado Ctrl + K ou Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    // Adiciona mensagem do usuário
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setInput("");
    setLoading(true);

    try {
      const res = await processCopilotCommandAction(query);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.reply,
          actionExecuted: res.actionExecuted,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ Ocorreu um erro ao comunicar com a inteligência.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante FAB */}
      <button
        type="button"
        className="ascend-copilot-fab"
        onClick={() => setIsOpen(true)}
        title="Ascend AI Copilot (Ctrl + K)"
      >
        <div className="copilot-pulse-ring" />
        <Sparkles size={24} />
      </button>

      {/* Drawer / Panel Modal Flutuante */}
      {isOpen && (
        <div className="copilot-drawer-overlay" onClick={() => setIsOpen(false)}>
          <div className="copilot-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="copilot-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "36px", height: "36px", background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.4)" }}
                >
                  <Sparkles size={18} className="gold-text" />
                </div>
                <div>
                  <h4 className="ascend-title mb-0" style={{ fontSize: "1.1rem" }}>
                    Ascend AI Copilot
                  </h4>
                  <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                    Inteligência Operacional Gemini 2.5
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-dark border border-secondary text-muted small d-none d-sm-inline">
                  <Command size={12} className="me-1" /> Ctrl + K
                </span>
                <button
                  type="button"
                  className="btn btn-sm text-white-50 p-1"
                  onClick={() => setIsOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="copilot-body">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={msg.sender === "user" ? "copilot-msg-user" : "copilot-msg-ai"}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                </div>
              ))}
              {loading && (
                <div className="copilot-msg-ai text-muted small d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm gold-text" />
                  Processando comandos e mutações...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões Rápidas */}
            <div className="px-3 py-2 border-top border-secondary d-flex gap-2 overflow-auto" style={{ background: "rgba(0,0,0,0.2)" }}>
              <button
                type="button"
                className="copilot-chip border-0"
                onClick={() => handleSend("Adicionar despesa de R$ 45 em Alimentação com almoço")}
              >
                <Zap size={12} className="me-1 gold-text" /> +R$ 45 Almoço
              </button>
              <button
                type="button"
                className="copilot-chip border-0"
                onClick={() => handleSend("Registrar 2 ovos mexidos com 250 kcal no diário de saúde")}
              >
                🥗 +Refeição 250kcal
              </button>
              <button
                type="button"
                className="copilot-chip border-0"
                onClick={() => handleSend("Crie uma nova jornada para Aprender TypeScript na categoria Estudos")}
              >
                🚀 Nova Jornada
              </button>
            </div>

            {/* Input Footer */}
            <div className="copilot-footer">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="d-flex gap-2"
              >
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Digite um comando (ex: Adicionar R$ 50 em Finanças)..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" className="btn btn-ascend px-3" disabled={loading}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiCopilotDrawer;
