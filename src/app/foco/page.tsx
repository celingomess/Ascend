import React from "react";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import FocoClient from "@/components/FocoClient";
import "@/styles/foco.css";

export const revalidate = 0;

export default async function FocoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id);
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    redirect("/login");
  }

  // Buscar sessões de foco recentes
  const recentSessions = await prisma.focus_sessions.findMany({
    where: { user_id: userId },
    orderBy: { criado_em: "desc" },
    take: 10,
  });

  const serializedSessions = recentSessions.map((s) => ({
    ...s,
    criado_em: s.criado_em.toISOString(),
  }));

  return (
    <FocoClient
      user={{
        id: user.id,
        nome: user.nome,
        nivel: user.nivel || 1,
        xp_total: user.xp_total || 0,
      }}
      initialSessions={serializedSessions}
    />
  );
}
