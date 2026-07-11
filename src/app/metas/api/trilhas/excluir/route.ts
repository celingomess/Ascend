import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "ID da trilha é obrigatório" }, { status: 400 });
    }

    const trilhaId = parseInt(id, 10);

    // 1. Excluir etapas
    await prisma.goal_progress_steps.deleteMany({
      where: { progress_id: trilhaId },
    });

    // 2. Excluir a trilha
    await prisma.goal_progress.delete({
      where: { id: trilhaId },
    });

    return NextResponse.json({ success: true, message: "Trilha excluída com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
