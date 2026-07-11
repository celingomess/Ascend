import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { goal_id, titulo, descricao } = await req.json();

    if (!goal_id || !titulo) {
      return NextResponse.json({ success: false, message: "ID da Jornada e Título são obrigatórios" }, { status: 400 });
    }

    // Obter última ordem dos blocos
    const lastBlock = await prisma.goal_blocks.findFirst({
      where: { goal_id },
      orderBy: { ordem: "desc" },
    });

    const nextOrder = lastBlock && lastBlock.ordem ? lastBlock.ordem + 1 : 1;

    const bloco = await prisma.goal_blocks.create({
      data: {
        goal_id,
        titulo,
        descricao: descricao || null,
        ordem: nextOrder,
        criado_em: new Date(),
      },
    });

    return NextResponse.json({ success: true, bloco });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
