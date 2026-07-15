import React from "react";
import prisma from "@/lib/prisma";
import SaudeClientInitial from "@/components/SaudeClientInitial";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0; // Garantir dados reais do banco MySQL

export default async function SaudePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  // 1. Obter Usuário Logado
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="ascend-title text-danger">Usuário não encontrado.</h2>
        <p className="text-muted">Por favor, verifique a conexão com o banco MySQL.</p>
      </div>
    );
  }

  // 2. Obter ou criar registro de nutrição para hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let nutrition = await prisma.daily_nutrition.findFirst({
    where: { user_id: user.id, data: hoje },
  });

  if (!nutrition) {
    nutrition = await prisma.daily_nutrition.create({
      data: {
        user_id: user.id,
        data: hoje,
        calorias_consumidas: 0,
        calorias_meta: 2000,
        proteina: 0,
        carboidrato: 0,
        gordura: 0,
        agua_ml: 0,
      },
    });
  }

  // 3. Obter treinos do usuário com exercícios
  const workouts = await prisma.workouts.findMany({
    where: { user_id: user.id },
    orderBy: { criado_em: "asc" },
  });

  const workoutsWithExercises = await Promise.all(
    workouts.map(async (w) => {
      const exercises = await prisma.workout_exercises.findMany({
        where: { workout_id: w.id },
        orderBy: { ordem: "asc" },
      });
      return {
        id: w.id,
        user_id: w.user_id,
        nome: w.nome,
        dias_semana: w.dias_semana,
        conteudo: w.conteudo,
        exercises: exercises.map(ex => ({
          id: ex.id,
          workout_id: ex.workout_id,
          nome_exercicio: ex.nome_exercicio,
          series: ex.series,
          repeticoes: ex.repeticoes,
          carga_atual: ex.carga_atual,
          ordem: ex.ordem
        }))
      };
    })
  );

  // 4. Obter logs de treinos recentes do usuário (todos para o heatmap)
  const workoutLogs = await prisma.workout_logs.findMany({
    where: { user_id: user.id },
    orderBy: { data_conclusao: "desc" },
  });

  // Mapear logs com nomes de treinos para facilidade de exibição
  const workoutLogsWithNames = workoutLogs.map((log) => {
    const matchingWorkout = workouts.find((w) => w.id === log.workout_id);
    return {
      id: log.id,
      user_id: log.user_id,
      workout_id: log.workout_id,
      data_conclusao: log.data_conclusao.toISOString(),
      workout_nome: matchingWorkout ? matchingWorkout.nome : "Rotina de Treino",
    };
  });

  // 5. Histórico de pesos (para o gráfico SVG de duplo eixo)
  const weights = await prisma.weightHistory.findMany({
    where: { userId: user.id },
    orderBy: { dataRegistro: "asc" },
  });
  const serializedWeights = weights.map((w) => ({
    id: w.id,
    peso: w.peso,
    dataRegistro: w.dataRegistro.toISOString(),
  }));

  // 6. Histórico de nutrição (para o mapa de calor e cálculo de TDEE)
  const allNutritions = await prisma.daily_nutrition.findMany({
    where: { user_id: user.id },
    orderBy: { data: "asc" },
  });
  const serializedNutritions = allNutritions.map((n) => ({
    id: n.id,
    caloriasConsumidas: n.calorias_consumidas || 0,
    caloriasMeta: n.calorias_meta || 2000,
    aguaMl: n.agua_ml || 0,
    data: n.data.toISOString(),
  }));

  // 7. Histórico de cargas (para o gráfico SVG de duplo eixo)
  const loadHistory = await prisma.workout_exercise_history.findMany({
    where: { user_id: user.id },
    orderBy: { data_registro: "asc" },
  });
  const serializedLoadHistory = loadHistory.map((lh) => ({
    id: lh.id,
    carga: lh.carga,
    dataRegistro: lh.data_registro.toISOString(),
  }));

  // 8. Relatórios de IA
  const rawReports = await prisma.healthAiReports.findMany({
    where: { userId: user.id },
    orderBy: { criadoEm: "desc" },
  });
  const serializedReports = rawReports.map((r) => {
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

  return (
    <SaudeClientInitial
      user={{
        id: user.id,
        nome: user.nome,
        nivel: user.nivel || 1,
        xp_total: user.xp_total || 0,
        avatar: user.avatar,
        peso: user.peso || 80
      }}
      initialNutrition={{
        id: nutrition.id,
        user_id: nutrition.user_id,
        data: nutrition.data.toISOString(),
        calorias_consumidas: nutrition.calorias_consumidas || 0,
        calorias_meta: nutrition.calorias_meta || 2000,
        proteina: nutrition.proteina || 0,
        carboidrato: nutrition.carboidrato || 0,
        gordura: nutrition.gordura || 0,
        agua_ml: nutrition.agua_ml || 0
      }}
      workouts={workoutsWithExercises}
      workoutLogs={workoutLogsWithNames}
      initialWeights={serializedWeights}
      initialNutritions={serializedNutritions}
      initialLoadHistory={serializedLoadHistory}
      initialReports={serializedReports}
    />
  );
}
