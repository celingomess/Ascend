import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { goal_id: string } }
) {
  try {
    const goalId = parseInt(params.goal_id, 10);

    // Encontrar blocos (áreas) vinculados à jornada
    const blocks = await prisma.goal_blocks.findMany({
      where: { goal_id: goalId },
    });

    const blockIds = blocks.map((b) => b.id);

    if (blockIds.length > 0) {
      // 1. Excluir opções de itens
      const items = await prisma.goal_block_items.findMany({
        where: { block_id: { in: blockIds } },
      });
      const itemIds = items.map((i) => i.id);

      if (itemIds.length > 0) {
        await prisma.goal_block_item_options.deleteMany({
          where: { item_id: { in: itemIds } },
        });
      }

      // 2. Excluir itens
      await prisma.goal_block_items.deleteMany({
        where: { block_id: { in: blockIds } },
      });

      // 3. Excluir etapas de trilhas de progresso
      const progresses = await prisma.goal_progress.findMany({
        where: { block_id: { in: blockIds } },
      });
      const progressIds = progresses.map((p) => p.id);

      if (progressIds.length > 0) {
        await prisma.goal_progress_steps.deleteMany({
          where: { progress_id: { in: progressIds } },
        });
      }

      // 4. Excluir trilhas
      await prisma.goal_progress.deleteMany({
        where: { block_id: { in: blockIds } },
      });

      // 5. Excluir blocos
      await prisma.goal_blocks.deleteMany({
        where: { goal_id: goalId },
      });
    }

    // 6. Excluir a jornada
    await prisma.goals.delete({
      where: { id: goalId },
    });

    return NextResponse.json({ success: true, message: "Jornada excluída com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
