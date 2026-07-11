import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { block_id, titulo, etapas } = await req.json();

    if (!block_id || !titulo || !etapas) {
      return NextResponse.json({ success: false, message: "ID do bloco, título e etapas são obrigatórios" }, { status: 400 });
    }

    const blockId = parseInt(block_id, 10);

    // Obter última ordem de trilhas
    const lastProgress = await prisma.goal_progress.findFirst({
      where: { block_id: blockId },
      orderBy: { ordem: "desc" },
    });
    const nextOrder = lastProgress && lastProgress.ordem ? lastProgress.ordem + 1 : 1;

    // Criar Trilha
    const trilha = await prisma.goal_progress.create({
      data: {
        block_id: blockId,
        titulo: titulo,
        ordem: nextOrder,
        criado_em: new Date(),
      },
    });

    // Criar Etapas
    const lines = etapas
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line !== "");

    const createdSteps: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      const step = await prisma.goal_progress_steps.create({
        data: {
          progress_id: trilha.id,
          titulo: lines[i],
          concluido: false,
          ordem: i + 1,
          criado_em: new Date(),
        },
      });
      createdSteps.push(step);
    }

    return NextResponse.json({
      success: true,
      trilha: {
        ...trilha,
        etapas: createdSteps,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
