import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { exercise_id: string } }
) {
  try {
    const exerciseId = parseInt(params.exercise_id, 10);
    const formData = await req.formData();
    const carga = parseFloat(formData.get("carga") as string || "0");

    // 1. Atualiza a carga atual do exercício
    const updatedEx = await prisma.workout_exercises.update({
      where: { id: exerciseId },
      data: { carga_atual: carga },
    });

    // 2. Grava ou atualiza o histórico de carga para hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const existingHistory = await prisma.workout_exercise_history.findFirst({
      where: {
        user_id: 1,
        workout_id: updatedEx.workout_id,
        exercise_name: updatedEx.nome_exercicio,
        data_registro: hoje,
      },
    });

    if (existingHistory) {
      await prisma.workout_exercise_history.update({
        where: { id: existingHistory.id },
        data: { carga: carga },
      });
    } else {
      await prisma.workout_exercise_history.create({
        data: {
          user_id: 1,
          workout_id: updatedEx.workout_id,
          exercise_name: updatedEx.nome_exercicio,
          carga: carga,
          data_registro: hoje,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
