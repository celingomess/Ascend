import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { workout_id: string } }
) {
  try {
    const workoutId = parseInt(params.workout_id, 10);
    const formData = await req.formData();
    const nome = (formData.get("nome_exercicio") as string || "").trim();
    const series = parseInt(formData.get("series") as string || "4", 10);
    const repeticoes = (formData.get("repeticoes") as string || "8-12").trim();
    const carga = parseFloat(formData.get("carga") as string || "0");

    if (!nome) {
      return NextResponse.json({ success: false, message: "Nome é obrigatório." }, { status: 400 });
    }

    const lastEx = await prisma.workout_exercises.findFirst({
      where: { workout_id: workoutId },
      orderBy: { ordem: "desc" },
    });
    const novaOrdem = lastEx ? (lastEx.ordem ?? 0) + 1 : 0;

    const newExercise = await prisma.workout_exercises.create({
      data: {
        workout_id: workoutId,
        nome_exercicio: nome,
        series: series,
        repeticoes: repeticoes,
        carga_atual: carga,
        ordem: novaOrdem,
      },
    });

    return NextResponse.json({
      success: true,
      exercise: newExercise,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
