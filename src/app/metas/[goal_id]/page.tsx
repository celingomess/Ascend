import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import MetaDetalheClient from "@/components/MetaDetalheClient";

interface MetaDetalhePageProps {
  params: { goal_id: string };
}

export const revalidate = 0; // Garantir dados em tempo real

export default async function MetaDetalhePage({ params }: MetaDetalhePageProps) {
  const goalId = parseInt(params.goal_id, 10);

  if (isNaN(goalId)) {
    return notFound();
  }

  // 1. Buscar a Jornada
  const meta = await prisma.goals.findUnique({
    where: { id: goalId },
  });

  if (!meta) {
    return notFound();
  }

  // 2. Buscar Blocos (Áreas)
  const blocks = await prisma.goal_blocks.findMany({
    where: { goal_id: goalId },
    orderBy: { ordem: "asc" },
  });

  const blockIds = blocks.map((b) => b.id);

  // 3. Buscar Itens dos Blocos
  let itemsList: any[] = [];
  let progressesList: any[] = [];
  let stepsList: any[] = [];

  if (blockIds.length > 0) {
    itemsList = await prisma.goal_block_items.findMany({
      where: { block_id: { in: blockIds } },
      orderBy: { ordem: "asc" },
    });

    progressesList = await prisma.goal_progress.findMany({
      where: { block_id: { in: blockIds } },
      orderBy: { ordem: "asc" },
    });

    const progressIds = progressesList.map((p) => p.id);
    if (progressIds.length > 0) {
      stepsList = await prisma.goal_progress_steps.findMany({
        where: { progress_id: { in: progressIds } },
        orderBy: { ordem: "asc" },
      });
    }
  }

  // 4. Estruturar os blocos com seus respectivos itens, trilhas e progressos
  const blocosComItens = blocks.map((bloco) => {
    // Filtrar itens do bloco
    const rawItens = itemsList.filter((item) => item.block_id === bloco.id);

    // Separar itens pai e filhos (para subtarefas)
    const itensPai = rawItens.filter((item) => item.parent_id === null);
    const itens = itensPai.map((item) => {
      return {
        ...item,
        filhos: rawItens.filter((child) => child.parent_id === item.id),
      };
    });

    // Trilhas de progresso (progressos)
    const progressos = progressesList
      .filter((p) => p.block_id === bloco.id)
      .map((progress) => {
        return {
          ...progress,
          etapas: stepsList.filter((s) => s.progress_id === progress.id),
        };
      });

    // Calcular progresso médio do bloco
    // Itens concluídos vs totais + Etapas concluídas vs totais
    let totalItens = 0;
    let concluidos = 0;

    // Mini metas (checklist)
    itens.forEach((item) => {
      if (item.tipo === "mini_meta") {
        if (item.filhos && item.filhos.length > 0) {
          item.filhos.forEach((filho: any) => {
            totalItens++;
            if (filho.concluido) concluidos++;
          });
        } else {
          totalItens++;
          if (item.concluido) concluidos++;
        }
      }
    });

    // Etapas das trilhas
    progressos.forEach((p) => {
      p.etapas.forEach((e: any) => {
        totalItens++;
        if (e.concluido) concluidos++;
      });
    });

    const media_progresso =
      totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

    return {
      bloco,
      itens,
      progressos,
      media_progresso,
    };
  });

  return (
    <MetaDetalheClient
      goal={meta}
      initialBlocosComItens={blocosComItens}
    />
  );
}
