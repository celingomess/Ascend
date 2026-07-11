import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "ID do item é obrigatório" }, { status: 400 });
    }

    const itemId = parseInt(id, 10);

    // 1. Excluir opções se houver
    await prisma.goal_block_item_options.deleteMany({
      where: { item_id: itemId },
    });

    // 2. Excluir subtarefas filhas
    await prisma.goal_block_items.deleteMany({
      where: { parent_id: itemId },
    });

    // 3. Excluir o item pai
    await prisma.goal_block_items.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, message: "Item excluído com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
