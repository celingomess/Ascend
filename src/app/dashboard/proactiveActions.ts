"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Memória em cache em nível de servidor para evitar chamadas redundantes da IA no mesmo dia
const briefingCache: Record<number, { date: string; briefing: any }> = {};

export async function generateProactiveBriefingAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "Não autorizado." };
    }
    const userId = session.user.id;
    const hojeStr = new Date().toISOString().split("T")[0];

    // Verificar se já temos o briefing em cache para hoje
    if (briefingCache[userId] && briefingCache[userId].date === hojeStr) {
      return {
        success: true,
        briefing: briefingCache[userId].briefing,
        cached: true,
      };
    }

    // 1. Obter dados do usuário
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: "Usuário não encontrado." };
    }

    // 2. Obter nutrição de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const nutritionHoje = await prisma.daily_nutrition.findFirst({
      where: { user_id: userId, data: hoje },
    });

    // 3. Obter treinos concluídos nos últimos 3 dias
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(hoje.getDate() - 3);
    const treinosRecentes = await prisma.workout_logs.count({
      where: { user_id: userId, data_conclusao: { gte: tresDiasAtras } },
    });

    // 4. Obter saldo financeiro do mês
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const transacoesMes = await prisma.financial_transactions.findMany({
      where: { user_id: userId, data: { gte: primeiroDiaMes } },
    });

    const receitaMes = transacoesMes
      .filter((t) => t.valor > 0)
      .reduce((acc, t) => acc + t.valor, 0);
    const despesaMes = transacoesMes
      .filter((t) => t.valor < 0)
      .reduce((acc, t) => acc + Math.abs(t.valor), 0);
    const saldoMes = receitaMes - despesaMes;

    // 5. Obter metas ativas
    const metasAtivas = await prisma.goals.count({
      where: { user_id: userId, status: "Em andamento" },
    });

    // Calcular TMB / TDEE estimado
    const peso = user.peso || 80;
    const altura = user.altura || 175;
    const idade = user.idade || 25;
    const tmb = Math.round(10 * peso + 6.25 * altura - 5 * idade + 5);
    const tdeeEstimado = Math.round(tmb * 1.375);
    const caloriasIngeridas = nutritionHoje?.calorias_consumidas || 0;
    const saldoCaloricoDia = caloriasIngeridas - tdeeEstimado;

    let headline = "Foco total na execução de alta performance";
    let conselho = `Mantenha a consistência nos treinos e acompanhe sua hidratação diária para acelerar a recomposição corporal.`;
    let statusRank = user.nivel >= 5 ? "Estrategista de Elite" : "Operativo em Ascensão";
    let dicaChave = "Garante pelo menos 2 litros de água e cumpra seu bloco de foco hoje.";

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
Você é o Conselheiro Estratégico Proativo do Ascend OS. Analise o estado atual do usuário:
- Nome: ${user.nome} (Nível ${user.nivel}, Streak: ${user.streak_atual || 0} dias)
- Peso: ${peso}kg, Altura: ${altura}cm, TDEE Estimado: ${tdeeEstimado} kcal
- Calorias Ingeridas Hoje: ${caloriasIngeridas} kcal (Saldo: ${saldoCaloricoDia > 0 ? "+" : ""}${saldoCaloricoDia} kcal)
- Treinos concluídos nos últimos 3 dias: ${treinosRecentes}
- Saldo financeiro do mês atual: R$ ${saldoMes.toFixed(2)}
- Jornadas/Metas ativas em andamento: ${metasAtivas}

Gere um briefing executivo proativo e altamente motivador.
Responda APENAS com um objeto JSON válido (sem markdown):
{
  "headline": "Frase de impacto curta para o dia (máx 8 palavras)",
  "conselho": "Análise executiva de 2 frases baseada nos seus dados de saúde/finanças",
  "dicaChave": "Uma ação prática prioritária para realizar hoje",
  "statusRank": "Título honorífico motivador curto"
}
        `.trim();

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(text.substring(start, end + 1));
          headline = parsed.headline || headline;
          conselho = parsed.conselho || conselho;
          dicaChave = parsed.dicaChave || dicaChave;
          statusRank = parsed.statusRank || statusRank;
        }
      } catch (err: any) {
        console.warn("[Proactive Copilot Warning]:", err.message);
      }
    }

    const briefingPayload = {
      headline,
      conselho,
      dicaChave,
      statusRank,
      streak: user.streak_atual || 0,
      tdeeEstimado,
      caloriasIngeridas,
      saldoCaloricoDia,
      treinosRecentes,
      saldoMes,
      metasAtivas,
    };

    // Salvar em cache no servidor para o dia
    briefingCache[userId] = {
      date: hojeStr,
      briefing: briefingPayload,
    };

    return {
      success: true,
      briefing: briefingPayload,
      cached: false,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Erro ao gerar briefing proativo: " + error.message,
    };
  }
}
