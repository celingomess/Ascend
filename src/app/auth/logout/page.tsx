"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  useEffect(() => {
    // Executa encerramento de sessão automático
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3" style={{ background: "radial-gradient(circle at center, #07110c 0%, #030604 100%)" }}>
      <div
        className="glass-card p-5 text-center"
        style={{
          maxWidth: "420px",
          width: "100%",
          background: "rgba(9, 18, 12, 0.85)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "28px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.9)",
        }}
      >
        <div className="mb-4">
          <div className="spinner-border text-warning mb-3" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
            <span className="visually-hidden">Carregando...</span>
          </div>
          <h3 className="ascend-title text-white mb-2" style={{ fontSize: "1.5rem" }}>
            Encerrando Sessão
          </h3>
          <p className="text-muted small mb-0">
            Sua sessão no Ascend OS está sendo finalizada com segurança...
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-ascend-outline w-100"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Redirecionar para o Login
        </button>
      </div>
    </div>
  );
}
