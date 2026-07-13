import { differenceInDays } from "date-fns";

function getLocalDateMidnight(date: Date): Date {
  const localDateStr = date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return new Date(`${localDateStr}T00:00:00Z`);
}

export async function updateUserStreak(userId: number, prismaInstance: any) {
  const user = await prismaInstance.users.findUnique({
    where: { id: userId },
  });
  if (!user) return;

  const hojeLocal = getLocalDateMidnight(new Date());
  const ultAtividadeLocal = user.ultima_atividade ? getLocalDateMidnight(new Date(user.ultima_atividade)) : null;

  if (!ultAtividadeLocal) {
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: 1,
        melhor_streak: 1,
        ultima_atividade: hojeLocal,
      },
    });
    return;
  }

  const diff = differenceInDays(hojeLocal, ultAtividadeLocal);

  if (diff === 1) {
    const novoStreak = (user.streak_atual ?? 0) + 1;
    const novoMelhor = Math.max(novoStreak, user.melhor_streak ?? 0);
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: novoStreak,
        melhor_streak: novoMelhor,
        ultima_atividade: hojeLocal,
      },
    });
  } else if (diff > 1) {
    await prismaInstance.users.update({
      where: { id: userId },
      data: {
        streak_atual: 1,
        ultima_atividade: hojeLocal,
      },
    });
  }
}
