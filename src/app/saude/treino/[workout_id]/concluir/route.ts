import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateUserStreak } from "@/lib/streaks";

export async function POST(
  req: NextRequest,
  { params }: { params: { workout_id: string } }
) {
  try {
    const workoutId = parseInt(params.workout_id, 10);

    // Criar log de treino concluído
    const log = await prisma.workout_logs.create({
      data: {
        user_id: 1,
        workout_id: workoutId,
        data_conclusao: new Date(),
      },
    });

    const workout = await prisma.workouts.findUnique({
      where: { id: workoutId },
    });

    const xpGanho = 20;

    // Registrar Evento
    await prisma.user_events.create({
      data: {
        user_id: 1,
        titulo: "Treino Concluído",
        descricao: `Finalizou o treino: ${workout?.nome || "Ficha"}`,
        tipo: "saude",
        xp: xpGanho,
        criado_em: new Date(),
      },
    });

    // Atualizar XP e nível do usuário
    const user = await prisma.users.findUnique({ where: { id: 1 } });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    let novoXp = (user.xp_total ?? 0) + xpGanho;
    let novoNivel = user.nivel ?? 1;
    let nivelSubiu = false;

    while (novoXp >= novoNivel * 500) {
      novoNivel += 1;
    }

    if (novoNivel > user.nivel!) {
      nivelSubiu = true;
    }

    await updateUserStreak(1, prisma);

    await prisma.users.update({
      where: { id: 1 },
      data: {
        xp_total: novoXp,
        nivel: novoNivel,
      },
    });

    return NextResponse.json({
      success: true,
      mensagem: "Treino registrado com sucesso!",
      xp_ganho: xpGanho,
      usuario_xp: novoXp,
      usuario_nivel: novoNivel,
      nivel_subiu: nivelSubiu,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
