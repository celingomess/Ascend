"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import LogoAscend from "@/components/LogoAscend";

interface SidebarProps {
  user: {
    nome: string;
    nivel: number;
    xp_total: number;
    avatar?: string | null;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  // Calcular progresso do nível atual (nível sobe a cada 500 XP)
  const xpNivelAtual = user.xp_total % 500;
  const percentualEvolucao = Math.round((xpNivelAtual / 500) * 100);

  // Normalização do caminho do avatar para evitar erro 404
  const avatarSrc = user.avatar
    ? user.avatar.startsWith("/") || user.avatar.startsWith("http")
      ? user.avatar
      : `/uploads/${user.avatar}`
    : null;

  // Obter Título do Rank de Acordo com o Nível
  const getRankTitle = (nivel: number) => {
    if (nivel >= 20) return "Dominador";
    if (nivel >= 15) return "Visionário";
    if (nivel >= 10) return "Estrategista";
    if (nivel >= 5) return "Arquiteto";
    if (nivel >= 3) return "Executor";
    if (nivel >= 2) return "Persistente";
    return "Despertar";
  };

  const rankTitle = getRankTitle(user.nivel);

  const menuItems = [
    { name: "Início", path: "/dashboard", iconClass: "bi bi-house-door" },
    { name: "Jornadas", path: "/metas", iconClass: "bi bi-compass" },
    { name: "Foco", path: "/foco", iconClass: "bi bi-clock-history" },
    { name: "Saúde", path: "/saude", iconClass: "bi bi-heart-pulse" },
    { name: "Finanças", path: "/financas", iconClass: "bi bi-bank" },
    { name: "Legado", path: "/conquistas", iconClass: "bi bi-trophy" },
    { name: "Ascensão", path: "/ascensao", iconClass: "bi bi-gem" },
    { name: "Hall", path: "/hall", iconClass: "bi bi-graph-up-arrow" },
    { name: "Perfil", path: "/perfil", iconClass: "bi bi-person" },
  ];

  return (
    <aside className="ascend-sidebar">
      <div className="sidebar-top">
        {/* Brand / Logo */}
        <Link href="/dashboard" className="sidebar-logo">
          <div className="logo-icon">
            <LogoAscend height={32} />
          </div>
          <div className="logo-text">
            <span className="logo-title">ASCEND OS</span>
            <span className="logo-subtitle">SISTEMA OPERACIONAL</span>
          </div>
        </Link>

        {/* User Card */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user.nome}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) fallback.classList.remove("d-none");
                }}
              />
            ) : null}
            <div className={`avatar-placeholder ${avatarSrc ? "d-none" : ""}`}>
              {user.nome ? user.nome.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          <div className="sidebar-rank text-center">{rankTitle}</div>
          <div className="sidebar-profile-name text-center text-truncate">{user.nome}</div>
          <div className="sidebar-profile-level text-center">Nível {user.nivel}</div>

          {/* XP Progress Bar */}
          <div className="sidebar-profile-progress mt-2">
            <div className="progress">
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${percentualEvolucao}%` }}
                aria-valuenow={percentualEvolucao}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <small className="text-muted d-block text-center mt-1">
              {xpNivelAtual} / 500 XP
            </small>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <i className={item.iconClass} style={{ fontSize: "1.2rem" }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sair */}
      <div className="sidebar-bottom">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-item text-danger border-0 bg-transparent w-100 text-start"
          style={{ cursor: "pointer" }}
        >
          <i className="bi bi-box-arrow-right text-danger" style={{ fontSize: "1.2rem" }} />
          <span className="text-danger fw-bold">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
