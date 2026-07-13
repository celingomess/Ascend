import { differenceInDays, startOfDay } from "date-fns";

export async function updateUserStreak(userId: number, prismaInstance: any) {
  const user = await prismaInstance.users.findUnique({
    where: { id: userId },
  });
  if (!user) return;

  const hoje = startOfDay(new Date());
  const ultAtividade = user.ultima_atividade ? startOfDay(new Date(user.ultima_atividade)) : null;

  if (!ultAtividade) {
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: 1,
        melhor_streak: 1,
        ultima_atividade: hoje,
      },
    });
    return;
  }

  const diff = differenceInDays(hoje, ultAtividade);

  if (diff === 1) {
    const novoStreak = (user.streak_atual ?? 0) + 1;
    const novoMelhor = Math.max(novoStreak, user.melhor_streak ?? 0);
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: novoStreak,
        melhor_streak: novoMelhor,
        ultima_atividade: hoje,
      },
    });
  } else if (diff > 1) {
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: 1,
        ultima_atividade: hoje,
      },
    });
  }
}
