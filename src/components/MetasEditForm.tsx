"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@/styles/metas.css";

interface Goal {
  id: number;
  user_id: number;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status: string | null;
  prazo: Date | null;
  progresso: number | null;
  cover_image: string | null;
  prazoFormatted: string;
}

interface MetasEditFormProps {
  goal: Goal;
}

export default function MetasEditForm({ goal }: MetasEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progressVal, setProgressVal] = useState<number>(goal.progresso ?? 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/metas/api/${goal.id}/editar`, {
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
        setErrorMessage(data.message || "Erro ao salvar alterações.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao salvar alterações.");
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
          <i className="bi bi-pencil-square"></i> Refinar Jornada
        </span>
        <h1 className="ascend-title" style={{ fontSize: "2rem" }}>Editar Jornada</h1>
        <p className="text-muted">Ajuste a direção, o progresso e a identidade visual da sua jornada.</p>
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
            <label htmlFor="titulo">Nome da Jornada</label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              className="profile-input"
              defaultValue={goal.titulo}
              required
            />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="profile-field mb-3">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" className="profile-input" defaultValue={goal.categoria} required>
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
                <label htmlFor="status">Status</label>
                <select id="status" name="status" className="profile-input" defaultValue={goal.status || "Em Andamento"} required>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="profile-field mb-3">
                <label htmlFor="prazo">Prazo Estimado</label>
                <input
                  type="date"
                  id="prazo"
                  name="prazo"
                  className="profile-input"
                  defaultValue={goal.prazoFormatted}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-field mb-3">
                <label htmlFor="progresso">Progresso: {progressVal}%</label>
                <input
                  type="range"
                  id="progresso"
                  name="progresso"
                  className="w-100"
                  min="0"
                  max="100"
                  value={progressVal}
                  onChange={(e) => setProgressVal(parseInt(e.target.value, 10))}
                  style={{ accentColor: "var(--gold-soft)" }}
                />
              </div>
            </div>
          </div>

          <div className="profile-field mb-3">
            <label htmlFor="descricao">Descrição / Propósito</label>
            <textarea
              id="descricao"
              name="descricao"
              className="profile-input"
              rows={4}
              defaultValue={goal.descricao || ""}
            ></textarea>
          </div>

          <div className="profile-field mb-4">
            <label htmlFor="cover_image">Imagem de Capa (Opcional)</label>
            {goal.cover_image && (
              <div className="mb-2 text-muted small">
                Capa atual: <Link href={`/uploads/${goal.cover_image}`} target="_blank" className="gold-text">{goal.cover_image}</Link>
              </div>
            )}
            <input
              type="file"
              id="cover_image"
              name="cover_image"
              className="profile-input"
              accept="image/*"
            />
            <div className="profile-help">Formatos recomendados: JPG, PNG ou WEBP. Deixe vazio para manter a imagem atual.</div>
          </div>

          <button type="submit" className="profile-submit w-100" disabled={loading}>
            {loading ? (
              <span>Salvando Alterações...</span>
            ) : (
              <>
                <i className="bi bi-check2-circle me-1"></i> Salvar Alterações
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
