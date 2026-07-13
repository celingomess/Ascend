"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUserAction } from "@/app/cadastro/actions";

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await registerUserAction(formData);

    setLoading(false);

    if (res.success) {
      router.push("/login?registered=true");
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="card text-white border border-secondary p-4 rounded-4 shadow-lg w-100 fade-in-up" style={{ maxWidth: "450px", background: "rgba(7,17,12,0.85)", backdropFilter: "blur(8px)" }}>
        <div className="text-center mb-4">
          <div className="logo-icon bg-warning text-dark d-inline-flex align-items-center justify-content-center rounded-circle fs-3 fw-bold mb-2" style={{ width: "50px", height: "50px", background: "var(--gold-soft)", fontFamily: "'Cormorant Garamond', serif" }}>A</div>
          <h2 className="ascend-title text-warning fs-3 mb-1" style={{ color: "var(--gold)" }}>Criar Conta</h2>
          <p className="text-muted small">Junte-se à jornada de evolução do Ascend OS</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small border-0 mb-3" style={{ background: "rgba(220,53,69,0.15)", color: "#ea868f" }}>
            <i className="bi bi-exclamation-triangle-fill me-2" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12">
            <label className="form-label text-muted small mb-1">Nome Completo</label>
            <input
              type="text"
              name="nome"
              className="form-control bg-transparent text-white border-secondary"
              placeholder="Digite seu nome"
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label text-muted small mb-1">Endereço de E-mail</label>
            <input
              type="email"
              name="email"
              className="form-control bg-transparent text-white border-secondary"
              placeholder="exemplo@email.com"
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label text-muted small mb-1">Senha de Acesso</label>
            <input
              type="password"
              name="password"
              className="form-control bg-transparent text-white border-secondary"
              placeholder="No mínimo 6 caracteres"
              required
            />
          </div>
          <div className="col-12 mt-4">
            <button type="submit" className="btn btn-ascend w-100" disabled={loading} style={{ minHeight: "48px" }}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Criando conta...
                </>
              ) : (
                "Criar Minha Conta"
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted small">Já possui uma conta? </span>
          <Link href="/login" className="gold-text small text-decoration-none fw-bold" style={{ color: "var(--gold-soft)" }}>
            Entrar no Sistema
          </Link>
        </div>
      </div>
    </div>
  );
}
