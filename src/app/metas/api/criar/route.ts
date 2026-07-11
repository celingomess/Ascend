import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const titulo = formData.get("titulo") as string;
    const descricao = formData.get("descricao") as string;
    const categoria = formData.get("categoria") as string;
    const prazoStr = formData.get("prazo") as string;
    const coverFile = formData.get("cover_image") as File | null;

    if (!titulo || !categoria) {
      return NextResponse.json(
        { success: false, message: "Título e categoria são obrigatórios" },
        { status: 400 }
      );
    }

    let coverName: string | null = null;
    if (coverFile && coverFile.size > 0) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      coverName = `${Date.now()}_${coverFile.name.replace(/\s+/g, "_")}`;

      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, coverName), buffer);
    }

    const newGoal = await prisma.goals.create({
      data: {
        user_id: 1,
        titulo: titulo,
        descricao: descricao || null,
        categoria: categoria,
        status: "Em Andamento",
        prazo: prazoStr ? new Date(prazoStr) : null,
        progresso: 0,
        data_criacao: new Date(),
        cover_image: coverName,
      },
    });

    return NextResponse.json({ success: true, id: newGoal.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
