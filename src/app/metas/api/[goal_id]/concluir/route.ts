import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { goal_id: string } }
) {
  try {
    const goalId = parseInt(params.goal_id, 10);

    // Encontrar jornada
    const goal = await prisma.goals.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json({ success: false, message: "Jornada não encontrada" }, { status: 404 });
    }

    const xpGanho = 50;

    // Atualizar status e progresso para 100%
    await prisma.goals.update({
      where: { id: goalId },
      data: {
        status: "Concluída",
        progresso: 100,
      },
    });

    // Registrar Evento no histórico
    await prisma.user_events.create({
      data: {
        user_id: 1,
        titulo: "Jornada Concluída",
        descricao: `Parabéns! Concluiu com sucesso a jornada: ${goal.titulo}`,
        tipo: "metas",
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

    await prisma.users.update({
      where: { id: 1 },
      data: {
        xp_total: novoXp,
        nivel: novoNivel,
        ultima_atividade: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      mensagem: "Jornada concluída!",
      xp_ganho: xpGanho,
      usuario_xp: novoXp,
      usuario_nivel: novoNivel,
      nivel_subiu: nivelSubiu,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
