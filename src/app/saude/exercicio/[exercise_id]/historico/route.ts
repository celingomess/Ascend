import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { exercise_id: string } }
) {
  try {
    const exerciseId = parseInt(params.exercise_id, 10);

    const ex = await prisma.workout_exercises.findUnique({
      where: { id: exerciseId },
    });

    if (!ex) {
      return NextResponse.json({ success: false, message: "Exercício não encontrado" }, { status: 404 });
    }

    const history = await prisma.workout_exercise_history.findMany({
      where: {
        user_id: 1,
        workout_id: ex.workout_id,
        exercise_name: ex.nome_exercicio,
      },
      orderBy: {
        data_registro: "asc",
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      history: history.map((h) => ({
        carga: h.carga,
        data: h.data_registro.toISOString().split("T")[0],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
