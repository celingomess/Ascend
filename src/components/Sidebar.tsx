"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Compass,
  HeartPulse,
  Clock,
  Award,
  Gem,
  TrendingUp,
  User,
  LogOut,
} from "lucide-react";

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

  const menuItems = [
    { name: "Início", path: "/dashboard", icon: () => <Home size={20} /> },
    { name: "Jornadas", path: "/metas", icon: () => <Compass size={20} /> },
    { name: "Foco", path: "/foco", icon: () => <Clock size={20} /> },
    { name: "Saúde", path: "/saude", icon: () => <HeartPulse size={20} /> },
    { name: "Finanças", path: "/financas", icon: () => <span className="bi bi-bank" style={{ fontSize: "1.2rem", color: "inherit" }} /> },
    { name: "Legado", path: "/conquistas", icon: () => <Award size={20} /> },
    { name: "Ascensão", path: "/ascensao", icon: () => <Gem size={20} /> },
    { name: "Hall", path: "/hall", icon: () => <TrendingUp size={20} /> },
    { name: "Perfil", path: "/perfil", icon: () => <User size={20} /> },
  ];

  return (
    <aside className="ascend-sidebar">
      <div>
        {/* Brand */}
        <div className="sidebar-brand">
          <h1>ASCEND OS</h1>
          <p>SISTEMA OPERACIONAL PESSOAL</p>
        </div>

        {/* User Card */}
        <div className="sidebar-user-card">
          <div className="user-avatar-wrapper position-relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.nome}
                className="user-avatar img-fluid"
                style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div className="user-avatar-placeholder d-flex align-items-center justify-content-center fw-bold bg-dark text-warning border border-secondary" style={{ width: "42px", height: "42px", borderRadius: "50%" }}>
                {user.nome ? user.nome.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
          <div className="user-info overflow-hidden">
            <span className="user-name text-truncate d-block text-white fw-bold">{user.nome}</span>
            <span className="user-level text-warning small fw-semibold">Nível {user.nivel}</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="sidebar-xp-container px-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1 style-xp-text" style={{ fontSize: "0.7rem" }}>
            <span className="text-muted fw-semibold">XP no Nível</span>
            <span className="text-warning fw-bold">{xpNivelAtual} / 500 XP</span>
          </div>
          <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
            <div
              className="progress-bar bg-warning"
              role="progressbar"
              style={{ width: `${percentualEvolucao}%`, transition: "width 0.4s ease" }}
              aria-valuenow={percentualEvolucao}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <Icon />
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
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
