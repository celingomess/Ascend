import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  calcularTituloAscend,
  calcularAvatarFrame,
  obterProgressaoTitulos,
  obterDominiosAscensao,
} from "@/lib/utils";
import PerfilClientInitial from "@/components/PerfilClientInitial";

export const revalidate = 0; // Garantir dados em tempo real

export default async function PerfilPage() {
  // 1. Obter Usuário Padrão ID=1
  const usuario = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!usuario) {
    return notFound();
  }

  // 2. Estatísticas de Metas
  const metas = await prisma.goals.findMany({
    where: { user_id: usuario.id },
  });

  const totalJornadas = metas.length;
  const jornadasConcluidas = metas.filter((m) => m.status === "Concluída").length;

  // 3. Conquistas e Insígnias
  const achievements = await prisma.achievements.findMany({
    where: { user_id: usuario.id },
  });

  const conquistasTotal = achievements.length;
  const insignias = achievements.map((a) => ({
    titulo: a.titulo,
    descricao: a.descricao || "Insígnia concedida por mérito de evolução.",
    icone: a.icone || "bi-award-fill",
    raridade: (a.raridade || "comum").toLowerCase(),
  }));

  // 4. Recorde de streak (melhor streak do usuário)
  const recordeGlobal = usuario.melhor_streak ?? 0;

  // 5. Cálculos Dinâmicos de Título, Progresso de Ranques e Domínios
  const xpTotal = usuario.xp_total ?? 0;
  const rankAtual = calcularTituloAscend(xpTotal);
  const avatarFrame = calcularAvatarFrame(xpTotal);
  const progressaoRanque = obterProgressaoTitulos(xpTotal);
  const dominiosAscensao = obterDominiosAscensao(metas);

  return (
    <PerfilClientInitial
      usuario={usuario}
      totalJornadas={totalJornadas}
      jornadasConcluidas={jornadasConcluidas}
      conquistasTotal={conquistasTotal}
      insignias={insignias}
      recordeGlobal={recordeGlobal}
      rankAtual={rankAtual}
      avatarFrame={avatarFrame}
      progressaoRanque={progressaoRanque}
      dominiosAscensao={dominiosAscensao}
    />
  );
}
