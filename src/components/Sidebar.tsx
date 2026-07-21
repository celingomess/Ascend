"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    { name: "Hall", path: "/hall", icon: () => <Gem size={20} /> },
    { name: "Ascensão", path: "/ascensao", icon: () => <TrendingUp size={20} /> },
    { name: "Perfil", path: "/perfil", icon: () => <User size={20} /> },
  ];

  return (
    <aside className="ascend-sidebar d-none d-md-flex">
      <div className="sidebar-top">
        {/* Logo */}
        <Link href="/dashboard" className="sidebar-logo">
          <div className="logo-icon">A</div>
          <div className="logo-text">
            <span className="logo-title">ASCEND</span>
            <span className="logo-subtitle">EVOLUÇÃO PESSOAL</span>
          </div>
        </Link>

        {/* Perfil no Topo */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {user.avatar ? (
              <img
                src={`/uploads/${user.avatar}`}
                alt={user.nome}
              />
            ) : (
              <div className="avatar-placeholder">
                {user.nome.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="sidebar-rank text-center">
            {pathname === "/perfil" ? "Perfil" : "Despertar"}
          </div>
          <div className="sidebar-profile-name text-center">
            {user.nome}
          </div>
          <div className="sidebar-profile-level text-center">
            Nível {user.nivel}
          </div>

          {/* Progresso de Nível */}
          <div className="sidebar-profile-progress mt-2">
            <div className="progress" style={{ height: "6px" }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${percentualEvolucao}%`, background: "var(--gold)" }}
                aria-valuenow={percentualEvolucao}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <small className="text-muted d-block text-center mt-1">{percentualEvolucao}% evolução geral</small>
          </div>
        </div>

        {/* Navegação */}
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
        <Link href="/auth/logout" className="sidebar-item text-danger">
          <LogOut size={20} />
          <span>Sair</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
