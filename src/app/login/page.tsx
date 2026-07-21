"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import LogoAscend from "@/components/LogoAscend";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Conta criada com sucesso! Faça login abaixo.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const email = e.currentTarget.email.value;
    const password = e.currentTarget.password.value;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <>
      {success && (
        <div className="alert alert-success py-2 px-3 small border-0 mb-3" style={{ background: "rgba(25,135,84,0.15)", color: "#75b798" }}>
          <i className="bi bi-check-circle-fill me-2" /> {success}
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 mb-3" style={{ background: "rgba(220,53,69,0.15)", color: "#ea868f" }}>
          <i className="bi bi-exclamation-triangle-fill me-2" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-12">
          <label className="form-label text-muted small mb-1">E-mail</label>
          <input
            type="email"
            name="email"
            className="form-control bg-transparent text-white border-secondary"
            placeholder="exemplo@email.com"
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label text-muted small mb-1">Senha</label>
          <input
            type="password"
            name="password"
            className="form-control bg-transparent text-white border-secondary"
            placeholder="Sua senha de acesso"
            required
          />
        </div>
        <div className="col-12 mt-4">
          <button type="submit" className="btn btn-ascend w-100" disabled={loading} style={{ minHeight: "48px" }}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Conectando...
              </>
            ) : (
              "Entrar no Sistema"
            )}
          </button>
        </div>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="card text-white border border-secondary p-4 rounded-4 shadow-lg w-100 fade-in-up" style={{ maxWidth: "450px", background: "rgba(7,17,12,0.85)", backdropFilter: "blur(8px)" }}>
        <div className="text-center mb-4">
          <div className="d-flex justify-content-center mb-1">
            <LogoAscend height={76} />
          </div>
          <h2 className="ascend-title text-warning fs-3 mb-1" style={{ color: "var(--gold)" }}>Entrar</h2>
          <p className="text-muted small">Gerencie seu legado e evolução diária</p>
        </div>

        <Suspense fallback={
          <div className="text-center py-4">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div className="text-center mt-4">
          <span className="text-muted small">Não possui uma conta? </span>
          <Link href="/cadastro" className="gold-text small text-decoration-none fw-bold" style={{ color: "var(--gold-soft)" }}>
            Cadastre-se grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
