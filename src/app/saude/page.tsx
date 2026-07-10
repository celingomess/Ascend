import React from "react";
import prisma from "@/lib/prisma";
import SaudeClientInitial from "@/components/SaudeClientInitial";

export const revalidate = 0; // Garantir dados reais do banco MySQL

export default async function SaudePage() {
  // 1. Obter Usuário Padrão ID=1
  const user = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="ascend-title text-danger">Usuário padrão não encontrado.</h2>
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
        ...w,
        exercises,
      };
    })
  );

  // 4. Obter logs de treinos recentes (últimos 10)
  const workoutLogs = await prisma.workout_logs.findMany({
    where: { user_id: user.id },
    orderBy: { data_conclusao: "desc" },
    take: 10,
  });

  // Mapear logs com nomes de treinos para facilidade de exibição
  const workoutLogsWithNames = workoutLogs.map((log) => {
    const matchingWorkout = workouts.find((w) => w.id === log.workout_id);
    return {
      ...log,
      workout_nome: matchingWorkout ? matchingWorkout.nome : "Rotina de Treino",
    };
  });

  return (
    <SaudeClientInitial
      user={user}
      initialNutrition={nutrition}
      workouts={workoutsWithExercises}
      workoutLogs={workoutLogsWithNames}
    />
  );
}
