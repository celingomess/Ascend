import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const peso = parseFloat(formData.get("peso") as string || "0");

    if (peso <= 0 || isNaN(peso)) {
      return NextResponse.json({ success: false, message: "Peso inválido" }, { status: 400 });
    }

    // Atualiza o peso do usuário padrão (ID=1)
    await prisma.users.update({
      where: { id: 1 },
      data: { peso: peso },
    });

    return NextResponse.json({ success: true, peso: peso });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
