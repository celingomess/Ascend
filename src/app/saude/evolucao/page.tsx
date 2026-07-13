import React from "react";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EvolucaoClient from "@/components/EvolucaoClient";

export const revalidate = 0;

export default async function EvolucaoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  // 1. Histórico de peso
  const weights = await prisma.weightHistory.findMany({
    where: { userId },
    orderBy: { dataRegistro: "asc" },
  });

  // 2. Registros de nutrição
  const nutritions = await prisma.daily_nutrition.findMany({
    where: { user_id: userId },
    orderBy: { data: "asc" },
  });

  // 3. Logs de treinos concluídos
  const workoutLogs = await prisma.workout_logs.findMany({
    where: { user_id: userId },
    orderBy: { data_conclusao: "asc" },
  });

  // 4. Histórico de cargas registradas
  const loadHistory = await prisma.workout_exercise_history.findMany({
    where: { user_id: userId },
    orderBy: { data_registro: "asc" },
  });

  // 5. Relatórios gerados pela IA
  const rawReports = await prisma.healthAiReports.findMany({
    where: { userId },
    orderBy: { criadoEm: "desc" },
  });

  const userDb = await prisma.users.findUnique({
    where: { id: userId },
    select: { peso: true },
  });

  // Serializar os relatórios para garantir compatibilidade com componentes cliente
  const reports = rawReports.map((r) => {
    let parsedInsights = { pontosFortes: [], melhorias: [], previsaoTdee: 2500 };
    if (r.insights) {
      if (typeof r.insights === "string") {
        try {
          parsedInsights = JSON.parse(r.insights);
        } catch (_) {}
      } else {
        parsedInsights = r.insights as any;
      }
    }
    return {
      id: r.id,
      criadoEm: r.criadoEm.toISOString(),
      tipo: r.tipo,
      conteudo: r.conteudo,
      insights: parsedInsights,
    };
  });

  // Formatar dados para passar ao cliente
  const serializedWeights = weights.map((w) => ({
    id: w.id,
    peso: w.peso,
    dataRegistro: w.dataRegistro.toISOString(),
  }));

  const serializedNutritions = nutritions.map((n) => ({
    id: n.id,
    caloriasConsumidas: n.calorias_consumidas || 0,
    caloriasMeta: n.calorias_meta || 2000,
    aguaMl: n.agua_ml || 0,
    data: n.data.toISOString(),
  }));

  const serializedWorkoutLogs = workoutLogs.map((wl) => ({
    id: wl.id,
    dataConclusao: wl.data_conclusao.toISOString(),
  }));

  const serializedLoadHistory = loadHistory.map((lh) => ({
    id: lh.id,
    carga: lh.carga,
    dataRegistro: lh.data_registro.toISOString(),
  }));

  return (
    <div className="container-fluid py-4">
      <EvolucaoClient
        initialWeights={serializedWeights}
        initialNutritions={serializedNutritions}
        initialWorkoutLogs={serializedWorkoutLogs}
        initialLoadHistory={serializedLoadHistory}
        initialReports={reports}
        currentWeight={userDb?.peso || 80}
      />
    </div>
  );
}
