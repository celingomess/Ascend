import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { workout_id: string } }
) {
  try {
    const workoutId = parseInt(params.workout_id, 10);

    await prisma.workout_exercises.deleteMany({ where: { workout_id: workoutId } });
    await prisma.workout_logs.deleteMany({ where: { workout_id: workoutId } });

    await prisma.workouts.delete({
      where: { id: workoutId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
