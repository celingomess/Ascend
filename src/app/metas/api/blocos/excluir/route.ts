import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { block_id } = await req.json();

    if (!block_id) {
      return NextResponse.json({ success: false, message: "ID do bloco é obrigatório" }, { status: 400 });
    }

    const blockId = parseInt(block_id, 10);

    // 1. Excluir opções de itens
    const items = await prisma.goal_block_items.findMany({
      where: { block_id: blockId },
    });
    const itemIds = items.map((i) => i.id);

    if (itemIds.length > 0) {
      await prisma.goal_block_item_options.deleteMany({
        where: { item_id: { in: itemIds } },
      });
    }

    // 2. Excluir itens (mini-metas, recursos, subtarefas)
    await prisma.goal_block_items.deleteMany({
      where: { block_id: blockId },
    });

    // 3. Excluir etapas de trilhas
    const progresses = await prisma.goal_progress.findMany({
      where: { block_id: blockId },
    });
    const progressIds = progresses.map((p) => p.id);

    if (progressIds.length > 0) {
      await prisma.goal_progress_steps.deleteMany({
        where: { progress_id: { in: progressIds } },
      });
    }

    // 4. Excluir trilhas
    await prisma.goal_progress.deleteMany({
      where: { block_id: blockId },
    });

    // 5. Excluir bloco
    await prisma.goal_blocks.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ success: true, message: "Área excluída com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
