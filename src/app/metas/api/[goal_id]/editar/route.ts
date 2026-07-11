import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { goal_id: string } }
) {
  try {
    const goalId = parseInt(params.goal_id, 10);
    const formData = await req.formData();
    const titulo = formData.get("titulo") as string;
    const descricao = formData.get("descricao") as string;
    const categoria = formData.get("categoria") as string;
    const status = formData.get("status") as string;
    const prazoStr = formData.get("prazo") as string;
    const progressoVal = parseInt(formData.get("progresso") as string, 10);
    const coverFile = formData.get("cover_image") as File | null;

    if (!titulo || !categoria) {
      return NextResponse.json(
        { success: false, message: "Título e categoria são obrigatórios" },
        { status: 400 }
      );
    }

    const currentGoal = await prisma.goals.findUnique({
      where: { id: goalId },
    });

    if (!currentGoal) {
      return NextResponse.json({ success: false, message: "Jornada não encontrada" }, { status: 404 });
    }

    let coverName = currentGoal.cover_image;
    if (coverFile && coverFile.size > 0) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      coverName = `${Date.now()}_${coverFile.name.replace(/\s+/g, "_")}`;
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, coverName), buffer);
    }

    await prisma.goals.update({
      where: { id: goalId },
      data: {
        titulo: titulo,
        descricao: descricao || null,
        categoria: categoria,
        status: status || "Em Andamento",
        prazo: prazoStr ? new Date(prazoStr) : null,
        progresso: isNaN(progressoVal) ? 0 : progressoVal,
        cover_image: coverName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
