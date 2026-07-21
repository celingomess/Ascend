"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AiCopilotDrawer from "@/components/AiCopilotDrawer";

interface AppShellProps {
  user: {
    nome: string;
    nivel: number;
    xp_total: number;
    avatar?: string | null;
  };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname?.startsWith("/auth");

  if (isAuthPage) {
    return <main className="w-100 min-vh-100 p-0 m-0">{children}</main>;
  }

  return (
    <div className="ascend-app-shell">
      <Sidebar user={user} />
      <main className="ascend-app-main">{children}</main>
      <MobileBottomNav />
      <AiCopilotDrawer />
    </div>
  );
}
