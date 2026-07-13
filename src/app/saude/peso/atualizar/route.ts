import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WeightSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await req.formData();
    const peso = parseFloat(formData.get("peso") as string || "0");

    // Validação estrita via Zod
    const validation = WeightSchema.safeParse({ peso });
    if (!validation.success) {
      const errorMsg = validation.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ success: false, message: "Erro de validação: " + errorMsg }, { status: 400 });
    }

    // Atualiza o peso do usuário
    await prisma.users.update({
      where: { id: userId },
      data: { peso: peso },
    });

    // Registrar também no histórico de pesos
    await prisma.weightHistory.create({
      data: {
        userId: userId,
        peso: peso,
      },
    });

    return NextResponse.json({ success: true, peso: peso });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
