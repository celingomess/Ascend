import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await req.formData();
    const peso = parseFloat(formData.get("peso") as string || "0");
    const altura = parseFloat(formData.get("altura") as string || "0");
    const idade = parseInt(formData.get("idade") as string || "0", 10);
    const sexo = (formData.get("sexo") as string || "M").toUpperCase();

    if (!peso || peso <= 0 || peso > 400) {
      return NextResponse.json({ success: false, message: "Por favor, digite um peso válido." }, { status: 400 });
    }

    const updateData: any = { peso };
    if (altura > 0) updateData.altura = altura;
    if (idade > 0) updateData.idade = idade;
    if (sexo) updateData.sexo = sexo;

    // Atualiza biometria do usuário
    await prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    // Registrar no histórico de pesos
    await prisma.weightHistory.create({
      data: {
        userId: userId,
        peso: peso,
      },
    });

    return NextResponse.json({ success: true, peso, altura, idade, sexo });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
