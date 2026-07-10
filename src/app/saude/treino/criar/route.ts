import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper para parsear as linhas de exercícios do importador rápido
function parseExerciseLine(line: string) {
  line = line.trim();
  if (!line) return null;

  const matchSpecs = line.match(/(\d+)\s*[xX]\s*([\d\-\–\s\w]+)/);

  let series = 4;
  let repeticoes = "8-12";
  let nome = line;
  let carga = 0;

  if (matchSpecs) {
    series = parseInt(matchSpecs[1], 10);
    repeticoes = matchSpecs[2].trim();

    const specsIndex = line.indexOf(matchSpecs[0]);
    nome = line.slice(0, specsIndex).trim();

    let remainder = line.slice(specsIndex + matchSpecs[0].length).trim();
    remainder = remainder.replace(/com|kg|kgs|de/gi, "").trim();
    const matchCarga = remainder.match(/[\d\.]+/);
    if (matchCarga) {
      carga = parseFloat(matchCarga[0]);
    }
  } else {
    const matchCargaOnly = line.match(/(\d+)\s*kg/i);
    if (matchCargaOnly) {
      carga = parseFloat(matchCargaOnly[1]);
      nome = line.replace(matchCargaOnly[0], "").trim();
    }
  }

  nome = nome.replace(/^[\s\-\–\—\•\*]+/gi, "").trim();
  if (!nome) nome = line;

  return {
    nome_exercicio: nome,
    series,
    repeticoes,
    carga_atual: carga,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, dias_semana, tipo, conteudo, exercicios_batch } = body;

    if (!nome) {
      return NextResponse.json({ success: false, message: "Nome do treino é obrigatório." }, { status: 400 });
    }

    // Criar o treino
    const newWorkout = await prisma.workouts.create({
      data: {
        user_id: 1,
        nome: nome.trim(),
        dias_semana: Array.isArray(dias_semana) ? dias_semana.join(",") : "",
        conteudo: tipo === "cardio" ? (conteudo || "").trim() : null,
        criado_em: new Date(),
      },
    });

    let createdExercises: any[] = [];

    // Se for musculação e tiver lote de exercícios, inserir todos
    if (tipo === "musculacao" && exercicios_batch) {
      const lines = String(exercicios_batch).split("\n");
      const parsed = lines
        .map(parseExerciseLine)
        .filter((ex) => ex !== null && ex.nome_exercicio);

      if (parsed.length > 0) {
        const dataToInsert = parsed.map((ex, idx) => ({
          workout_id: newWorkout.id,
          nome_exercicio: ex.nome_exercicio,
          series: ex.series,
          repeticoes: ex.repeticoes,
          carga_atual: ex.carga_atual,
          ordem: idx,
        }));

        await prisma.workout_exercises.createMany({
          data: dataToInsert,
        });

        createdExercises = await prisma.workout_exercises.findMany({
          where: { workout_id: newWorkout.id },
          orderBy: { ordem: "asc" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      workout: {
        ...newWorkout,
        exercises: createdExercises,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
