import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { workout_id: string } }
) {
  try {
    const workoutId = parseInt(params.workout_id, 10);
    const body = await req.json();
    const exercises = body.exercises;

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ success: false, message: "Lista de exercícios vazia." }, { status: 400 });
    }

    // Obter última ordem existente
    const lastEx = await prisma.workout_exercises.findFirst({
      where: { workout_id: workoutId },
      orderBy: { ordem: "desc" },
    });
    let startOrdem = lastEx ? (lastEx.ordem ?? 0) + 1 : 0;

    const dataToInsert = exercises.map((ex: any, idx: number) => ({
      workout_id: workoutId,
      nome_exercicio: ex.nome_exercicio || "Exercício",
      series: parseInt(ex.series, 10) || 4,
      repeticoes: String(ex.repeticoes || "8-12"),
      carga_atual: parseFloat(ex.carga) || 0,
      ordem: startOrdem + idx,
    }));

    // Criar múltiplos exercícios no banco
    await prisma.workout_exercises.createMany({
      data: dataToInsert,
    });

    // Recuperar todos os exercícios atualizados do treino
    const updatedExercises = await prisma.workout_exercises.findMany({
      where: { workout_id: workoutId },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json({
      success: true,
      exercises: updatedExercises,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
