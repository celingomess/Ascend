import React from "react";

export default function PerfilPlaceholderPage() {
  return (
    <div className="container py-5 text-center">
      <span className="badge-old mb-3">
        <i className="bi bi-clock-history"></i> Em Migração
      </span>
      <h2 className="ascend-title mb-3" style={{ fontSize: "1.8rem" }}>Perfil do Usuário</h2>
      <p className="text-muted mx-auto" style={{ maxWidth: "480px" }}>
        Estamos migrando a stack original do Flask para Next.js + TypeScript + MySQL. Este módulo estará disponível em breve!
      </p>
      <a href="/dashboard" className="btn btn-ascend mt-3">Voltar ao Início</a>
    </div>
  );
}
