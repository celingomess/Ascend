import React from "react";
import prisma from "@/lib/prisma";
import MetasClientInitial from "@/components/MetasClientInitial";

export const revalidate = 0; // Garantir dados em tempo real

export default async function MetasPage() {
  // Buscar todas as jornadas do usuário padrão (user_id = 1)
  const metas = await prisma.goals.findMany({
    where: { user_id: 1 },
    orderBy: { data_criacao: "desc" },
  });

  return <MetasClientInitial initialMetas={metas} />;
}
