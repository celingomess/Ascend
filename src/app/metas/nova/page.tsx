"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@/styles/metas.css";

export default function NovaJornadaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/metas/api/criar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        if (typeof window !== "undefined" && (window as any).AscendSFX) {
          (window as any).AscendSFX.playClick();
        }
        router.push("/metas");
        router.refresh();
      } else {
        setErrorMessage(data.message || "Ocorreu um erro ao criar a jornada.");
      }
    } catch (err: any) {
      setErrorMessage("Erro de rede ao criar a jornada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: "700px" }}>
      <header className="mb-4">
        <Link href="/metas" className="btn btn-ascend-outline mb-3">
          <i className="bi bi-arrow-left me-1"></i> Voltar para a Galeria
        </Link>
        <span className="badge-old mb-2 d-inline-block">
          <i className="bi bi-compass"></i> Nova Jornada
        </span>
        <h1 className="ascend-title" style={{ fontSize: "2rem" }}>Criar Nova Jornada</h1>
        <p className="text-muted">Esboce a direção da sua evolução definindo metas e prazos.</p>
      </header>

      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ background: "rgba(255,0,0,0.1)", borderColor: "rgba(255,0,0,0.2)", color: "#ff8080" }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </div>
      )}

      <div className="ascend-card p-4">
        <form onSubmit={handleSubmit} className="profile-form" encType="multipart/form-data">
          <div className="profile-field mb-3">
            <label htmlFor="titulo">Título da Jornada</label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              className="profile-input"
              placeholder="Ex: Aprender Inglês Fluente, Maratona de SP, etc."
              required
            />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="profile-field mb-3">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" className="profile-input" required>
                  <option value="Carreira">Carreira</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Projetos">Projetos</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Pessoal">Pessoal</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-field mb-3">
                <label htmlFor="prazo">Prazo Estimado (Opcional)</label>
                <input
                  type="date"
                  id="prazo"
                  name="prazo"
                  className="profile-input"
                />
              </div>
            </div>
          </div>

          <div className="profile-field mb-3">
            <label htmlFor="descricao">Descrição / Propósito da Jornada</label>
            <textarea
              id="descricao"
              name="descricao"
              className="profile-input"
              rows={4}
              placeholder="Qual é a sua principal motivação por trás desta jornada?"
            ></textarea>
          </div>

          <div className="profile-field mb-4">
            <label htmlFor="cover_image">Imagem de Capa Personalizada (Opcional)</label>
            <input
              type="file"
              id="cover_image"
              name="cover_image"
              className="profile-input"
              accept="image/*"
            />
            <div className="profile-help">Formatos aceitos: JPG, PNG ou WEBP. Deixe em branco para usar a capa padrão da categoria.</div>
          </div>

          <button type="submit" className="profile-submit w-100" disabled={loading}>
            {loading ? (
              <span>Criando Ambiente...</span>
            ) : (
              <>
                <i className="bi bi-check2-circle me-1"></i> Criar Jornada
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
