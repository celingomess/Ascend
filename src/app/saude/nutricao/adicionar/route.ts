import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateUserStreak } from "@/lib/streaks";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const calorias = parseInt(formData.get("calorias") as string || "0", 10);
    const proteina = parseInt(formData.get("proteina") as string || "0", 10);
    const carboidrato = parseInt(formData.get("carboidrato") as string || "0", 10);
    const gordura = parseInt(formData.get("gordura") as string || "0", 10);
    const agua = parseInt(formData.get("agua") as string || "0", 10);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Encontrar registro
    let nutrition = await prisma.daily_nutrition.findFirst({
      where: { user_id: 1, data: hoje },
    });

    if (!nutrition) {
      nutrition = await prisma.daily_nutrition.create({
        data: {
          user_id: 1,
          data: hoje,
          calorias_consumidas: 0,
          calorias_meta: 2000,
          proteina: 0,
          carboidrato: 0,
          gordura: 0,
          agua_ml: 0,
        },
      });
    }

    const metaAnterior = (nutrition.calorias_consumidas ?? 0) >= (nutrition.calorias_meta ?? 2000);

    // Atualizar no banco
    const updatedNutrition = await prisma.daily_nutrition.update({
      where: { id: nutrition.id },
      data: {
        calorias_consumidas: (nutrition.calorias_consumidas ?? 0) + calorias,
        proteina: (nutrition.proteina ?? 0) + proteina,
        carboidrato: (nutrition.carboidrato ?? 0) + carboidrato,
        gordura: (nutrition.gordura ?? 0) + gordura,
        agua_ml: (nutrition.agua_ml ?? 0) + agua,
      },
    });

    const metaAtingida = (updatedNutrition.calorias_consumidas ?? 0) >= (updatedNutrition.calorias_meta ?? 2000);

    // Gamificação: Obter usuário
    const user = await prisma.users.findUnique({ where: { id: 1 } });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    let xpGanho = 0;
    let nivelSubiu = false;
    const nivelAnterior = user.nivel ?? 1;

    // Hidratação
    if (agua > 0) {
      xpGanho += 5;
      await prisma.user_events.create({
        data: {
          user_id: 1,
          titulo: "Hidratação registrada",
          descricao: `Bebeu ${agua}ml de água`,
          tipo: "saude",
          xp: 5,
          criado_em: new Date(),
        },
      });
    }

    // Meta Calórica
    if (metaAtingida && !metaAnterior) {
      xpGanho += 15;
      await prisma.user_events.create({
        data: {
          user_id: 1,
          titulo: "Meta Calórica Atingida",
          descricao: "Bateu a meta de ingestão de calorias diária",
          tipo: "saude",
          xp: 15,
          criado_em: new Date(),
        },
      });
    }

    // Atualizar XP e nível do usuário
    let novoXp = (user.xp_total ?? 0) + xpGanho;
    let novoNivel = user.nivel ?? 1;
    while (novoXp >= novoNivel * 500) {
      novoNivel += 1;
    }

    if (novoNivel > nivelAnterior) {
      nivelSubiu = true;
    }

    await updateUserStreak(1, prisma);

    await prisma.users.update({
      where: { id: 1 },
      data: {
        xp_total: novoXp,
        nivel: novoNivel,
      },
    });

    return NextResponse.json({
      success: true,
      calorias_consumidas: updatedNutrition.calorias_consumidas,
      calorias_meta: updatedNutrition.calorias_meta,
      proteina: updatedNutrition.proteina,
      carboidrato: updatedNutrition.carboidrato,
      gordura: updatedNutrition.gordura,
      agua_ml: updatedNutrition.agua_ml,
      meta_atingida: metaAtingida && !metaAnterior,
      xp_ganho: xpGanho,
      usuario_nivel: novoNivel,
      usuario_xp: novoXp,
      nivel_subiu: nivelSubiu,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
