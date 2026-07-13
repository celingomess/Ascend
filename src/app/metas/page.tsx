import React from "react";
import prisma from "@/lib/prisma";
import MetasClientInitial from "@/components/MetasClientInitial";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0; // Garantir dados em tempo real

export default async function MetasPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  // Buscar todas as jornadas do usuário logado
  const metas = await prisma.goals.findMany({
    where: { user_id: session.user.id },
    orderBy: { data_criacao: "desc" },
  });

  return <MetasClientInitial initialMetas={metas} />;
}
