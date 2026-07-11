import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tipo, id } = await req.json();

    if (!tipo || !id) {
      return NextResponse.json({ success: false, message: "Tipo e ID são obrigatórios" }, { status: 400 });
    }

    const targetId = parseInt(id, 10);
    let concluido = false;
    let tituloItem = "";
    let blockId = 0;

    // 1. Alternar status no banco
    if (tipo === "item") {
      const item = await prisma.goal_block_items.findUnique({
        where: { id: targetId },
      });
      if (!item) {
        return NextResponse.json({ success: false, message: "Item não encontrado" }, { status: 404 });
      }

      concluido = !item.concluido;
      tituloItem = item.titulo;
      blockId = item.block_id;

      await prisma.goal_block_items.update({
        where: { id: targetId },
        data: {
          concluido,
          ultima_atividade: concluido ? new Date() : item.ultima_atividade,
        },
      });

      // Se o item tem filhos, e foi concluído, podemos marcar os filhos como concluídos?
      // Ou se todos os filhos forem marcados, marcamos o pai?
      // No nosso caso, o comportamento padrão é apenas alternar o estado do item clicado.
      if (item.parent_id !== null) {
        // Se for subtarefa, encontrar o pai e ver se todas as subtarefas do pai foram concluídas
        const parentItem = await prisma.goal_block_items.findUnique({
          where: { id: item.parent_id },
        });

        if (parentItem) {
          const siblingSubtasks = await prisma.goal_block_items.findMany({
            where: { parent_id: parentItem.id },
          });

          const allDone = siblingSubtasks.every((s) => s.id === targetId ? concluido : s.concluido);

          await prisma.goal_block_items.update({
            where: { id: parentItem.id },
            data: { concluido: allDone },
          });
        }
      }
    } else if (tipo === "etapa") {
      const step = await prisma.goal_progress_steps.findUnique({
        where: { id: targetId },
      });
      if (!step) {
        return NextResponse.json({ success: false, message: "Etapa não encontrada" }, { status: 404 });
      }

      concluido = !step.concluido;
      tituloItem = step.titulo;

      await prisma.goal_progress_steps.update({
        where: { id: targetId },
        data: { concluido },
      });

      const progress = await prisma.goal_progress.findUnique({
        where: { id: step.progress_id },
      });
      if (progress) {
        blockId = progress.block_id;
      }
    }

    // 2. Lógica de XP se concluiu
    let xpGanho = concluido ? 10 : 0; // Ganha 10 XP ao concluir, 0 se desmarcar
    let novoXp = 0;
    let novoNivel = 1;
    let nivelSubiu = false;

    const user = await prisma.users.findUnique({ where: { id: 1 } });

    if (user && xpGanho > 0) {
      // Registrar Evento no histórico
      await prisma.user_events.create({
        data: {
          user_id: 1,
          titulo: "Item Concluído",
          descricao: `Concluiu a tarefa: ${tituloItem}`,
          tipo: "metas",
          xp: xpGanho,
          criado_em: new Date(),
        },
      });

      // Calcular níveis
      novoXp = (user.xp_total ?? 0) + xpGanho;
      novoNivel = user.nivel ?? 1;

      while (novoXp >= novoNivel * 500) {
        novoNivel += 1;
      }

      if (novoNivel > user.nivel!) {
        nivelSubiu = true;
      }

      await prisma.users.update({
        where: { id: 1 },
        data: {
          xp_total: novoXp,
          nivel: novoNivel,
          ultima_atividade: new Date(),
        },
      });
    } else if (user) {
      novoXp = user.xp_total ?? 0;
      novoNivel = user.nivel ?? 1;
    }

    // 3. Recalcular Progresso Geral da Jornada (Goal)
    let novoProgressoGeral = 0;
    if (blockId > 0) {
      const currentBlock = await prisma.goal_blocks.findUnique({
        where: { id: blockId },
      });

      if (currentBlock) {
        const goalId = currentBlock.goal_id;

        // Buscar todos os blocos desta jornada
        const goalBlocks = await prisma.goal_blocks.findMany({
          where: { goal_id: goalId },
        });
        const goalBlockIds = goalBlocks.map((b) => b.id);

        if (goalBlockIds.length > 0) {
          // Itens
          const allItens = await prisma.goal_block_items.findMany({
            where: { block_id: { in: goalBlockIds }, tipo: "mini_meta" },
          });

          // Trilhas
          const allProgresses = await prisma.goal_progress.findMany({
            where: { block_id: { in: goalBlockIds } },
          });
          const allProgressIds = allProgresses.map((p) => p.id);

          let allSteps: any[] = [];
          if (allProgressIds.length > 0) {
            allSteps = await prisma.goal_progress_steps.findMany({
              where: { progress_id: { in: allProgressIds } },
            });
          }

          // Calcular total vs concluídos
          let totalCount = 0;
          let doneCount = 0;

          // Contar itens pai se não tem filhos, ou apenas os filhos se houver
          const itensPai = allItens.filter((i) => i.parent_id === null);
          itensPai.forEach((item) => {
            const filhos = allItens.filter((f) => f.parent_id === item.id);
            if (filhos.length > 0) {
              filhos.forEach((f) => {
                totalCount++;
                if (f.concluido) doneCount++;
              });
            } else {
              totalCount++;
              if (item.concluido) doneCount++;
            }
          });

          // Contar etapas
          allSteps.forEach((e) => {
            totalCount++;
            if (e.concluido) doneCount++;
          });

          novoProgressoGeral =
            totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

          // Atualizar no banco
          await prisma.goals.update({
            where: { id: goalId },
            data: {
              progresso: novoProgressoGeral,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      concluido,
      xp_ganho: xpGanho,
      usuario_xp: novoXp,
      usuario_nivel: novoNivel,
      nivel_subiu: nivelSubiu,
      novo_progresso_geral: novoProgressoGeral,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
