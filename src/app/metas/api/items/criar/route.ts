import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { block_id, tipo, titulo, conteudo, subtarefas } = await req.json();

    if (!block_id || !tipo || !titulo) {
      return NextResponse.json({ success: false, message: "ID do bloco, tipo e título são obrigatórios" }, { status: 400 });
    }

    const blockId = parseInt(block_id, 10);

    // Obter última ordem dos itens neste bloco
    const lastItem = await prisma.goal_block_items.findFirst({
      where: { block_id: blockId },
      orderBy: { ordem: "desc" },
    });
    const nextOrder = lastItem && lastItem.ordem ? lastItem.ordem + 1 : 1;

    // Criar o item principal (pai)
    const item = await prisma.goal_block_items.create({
      data: {
        block_id: blockId,
        titulo: titulo,
        concluido: false,
        ordem: nextOrder,
        criado_em: new Date(),
        tipo: tipo, // mini_meta, recurso
        conteudo: conteudo || null, // link para recursos
      },
    });

    let createdSubtasks: any[] = [];

    // Se houver subtarefas e o tipo for mini_meta
    if (tipo === "mini_meta" && subtarefas && subtarefas.trim() !== "") {
      const lines = subtarefas
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line !== "");

      for (let i = 0; i < lines.length; i++) {
        const sub = await prisma.goal_block_items.create({
          data: {
            block_id: blockId,
            titulo: lines[i],
            concluido: false,
            ordem: i + 1,
            criado_em: new Date(),
            tipo: "subtarefa",
            parent_id: item.id,
          },
        });
        createdSubtasks.push(sub);
      }
    }

    return NextResponse.json({
      success: true,
      item,
      subtarefas: createdSubtasks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
