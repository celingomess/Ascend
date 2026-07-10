import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const caloriasMeta = parseInt(formData.get("calorias_meta") as string || "2000", 10);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let nutrition = await prisma.daily_nutrition.findFirst({
      where: { user_id: 1, data: hoje },
    });

    if (!nutrition) {
      nutrition = await prisma.daily_nutrition.create({
        data: {
          user_id: 1,
          data: hoje,
          calorias_consumidas: 0,
          calorias_meta: caloriasMeta,
          proteina: 0,
          carboidrato: 0,
          gordura: 0,
          agua_ml: 0,
        },
      });
    } else {
      nutrition = await prisma.daily_nutrition.update({
        where: { id: nutrition.id },
        data: {
          calorias_meta: caloriasMeta,
        },
      });
    }

    return NextResponse.json({
      success: true,
      calorias_consumidas: nutrition.calorias_consumidas,
      calorias_meta: nutrition.calorias_meta,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
