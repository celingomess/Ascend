import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { exercise_id: string } }
) {
  try {
    const exerciseId = parseInt(params.exercise_id, 10);
    const formData = await req.formData();
    const carga = parseFloat(formData.get("carga") as string || "0");

    await prisma.workout_exercises.update({
      where: { id: exerciseId },
      data: { carga_atual: carga },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
