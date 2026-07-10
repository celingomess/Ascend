"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, HeartPulse, User } from "lucide-react";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Início", path: "/dashboard", icon: () => <Home size={20} /> },
    { name: "Jornadas", path: "/metas", icon: () => <Compass size={20} /> },
    { name: "Saúde", path: "/saude", icon: () => <HeartPulse size={20} /> },
    { name: "Finanças", path: "/financas", icon: () => <span className="bi bi-bank" style={{ fontSize: "1.2rem" }} /> },
    { name: "Perfil", path: "/perfil", icon: () => <User size={20} /> },
  ];

  return (
    <div className="mobile-bottom-nav d-flex d-md-none">
      {navItems.map((item) => {
        const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`mobile-nav-item ${isActive ? "active" : ""}`}
          >
            <div className="icon-wrapper">
              <Icon />
            </div>
            <span className="mobile-nav-label">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
