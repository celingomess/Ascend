import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateUserStreak } from "@/lib/streaks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { workout_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }
    const userId = session.user.id;

    const workoutId = parseInt(params.workout_id, 10);

    // Criar log de treino concluído
    const log = await prisma.workout_logs.create({
      data: {
        user_id: userId,
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
        user_id: userId,
        titulo: "Treino Concluído",
        descricao: `Finalizou o treino: ${workout?.nome || "Ficha"}`,
        tipo: "saude",
        xp: xpGanho,
        criado_em: new Date(),
      },
    });

    // Atualizar XP e nível do usuário
    const user = await prisma.users.findUnique({ where: { id: userId } });
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

    await updateUserStreak(userId, prisma);

    await prisma.users.update({
      where: { id: userId },
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
