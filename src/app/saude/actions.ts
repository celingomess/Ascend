"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateHealthReportAction(tipo: "SEMANAL" | "MENSAL") {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "Não autorizado." };
    }
    const userId = session.user.id;

    // Calcular o intervalo de datas
    const hoje = new Date();
    const diasAtras = tipo === "SEMANAL" ? 7 : 30;
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() - diasAtras);
    dataLimite.setHours(0, 0, 0, 0);

    // 1. Buscar logs de nutrição
    const logsNutrition = await prisma.daily_nutrition.findMany({
      where: {
        user_id: userId,
        data: { gte: dataLimite },
      },
    });

    // 2. Buscar logs de treinos
    const logsWorkouts = await prisma.workout_logs.findMany({
      where: {
        user_id: userId,
        data_conclusao: { gte: dataLimite },
      },
    });

    // 3. Buscar histórico de peso
    const logsWeights = await prisma.weightHistory.findMany({
      where: {
        userId: userId,
        dataRegistro: { gte: dataLimite },
      },
      orderBy: { dataRegistro: "desc" },
    });

    // Obter peso atual do usuário
    const userDb = await prisma.users.findUnique({
      where: { id: userId },
      select: { peso: true },
    });
    const pesoAtual = userDb?.peso || 80;

    let conteudo = "";
    let insightsObj: any = { pontosFortes: [], melhorias: [], previsaoTdee: 2500 };

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Você é o Personal Coach com IA do Ascend OS. Analise o seguinte histórico físico e nutricional do usuário nos últimos ${diasAtras} dias:
- Peso atual: ${pesoAtual} kg
- Histórico de peso registrado: ${JSON.stringify(logsWeights)}
- Histórico de nutrição (calorias, macros, água): ${JSON.stringify(logsNutrition)}
- Treinos concluídos: ${JSON.stringify(logsWorkouts)}

Gere um relatório de progresso detalhado em Markdown para o usuário.
O relatório deve conter:
1. Um diagnóstico dos hábitos (comportamento nutricional e frequência de treinos).
2. Uma previsão de evolução do peso corporal baseada no balanço calórico.
3. Estimativa do TDEE dinâmico.

Além do relatório em Markdown, você deve fornecer um objeto JSON com três chaves:
"pontosFortes" (array de strings), "melhorias" (array de strings) e "previsaoTdee" (número).

Retorne os dois formatos estruturados exatamente como:
---JSON_START---
{
  "pontosFortes": [...],
  "melhorias": [...],
  "previsaoTdee": 2500
}
---JSON_END---
---MARKDOWN_START---
[Seu Relatório em Markdown Aqui]
---MARKDOWN_END---
        `.trim();

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extrair o JSON e o Markdown usando marcadores
        const jsonMatch = text.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
        const mdMatch = text.match(/---MARKDOWN_START---([\s\S]*?)---MARKDOWN_END---/);

        if (jsonMatch && mdMatch) {
          insightsObj = JSON.parse(jsonMatch[1].trim());
          conteudo = mdMatch[1].trim();
        } else {
          throw new Error("Formato de resposta da IA inválido");
        }
      } catch (error) {
        console.error("Erro na API do Gemini, bailing para o fallback:", error);
        ({ conteudo, insightsObj } = runHeuristicFallback(logsNutrition, logsWorkouts, logsWeights, pesoAtual, diasAtras));
      }
    } else {
      ({ conteudo, insightsObj } = runHeuristicFallback(logsNutrition, logsWorkouts, logsWeights, pesoAtual, diasAtras));
    }

    // Salvar o relatório gerado no banco de dados
    await prisma.healthAiReports.create({
      data: {
        userId,
        tipo: tipo,
        conteudo: conteudo,
        insights: insightsObj,
      },
    });

    revalidatePath("/saude/evolucao");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: "Erro ao gerar relatório: " + error.message };
  }
}

function runHeuristicFallback(
  logsNutrition: any[],
  logsWorkouts: any[],
  logsWeights: any[],
  pesoAtual: number,
  totalDays: number
) {
  const diasComTreino = logsWorkouts.length;
  const totalDiasRegistrados = logsNutrition.length || 1;

  const mediaAgua = logsNutrition.reduce((acc, curr) => acc + (curr.agua_ml || 0), 0) / totalDiasRegistrados;
  const mediaCalorias = logsNutrition.reduce((acc, curr) => acc + (curr.calorias_consumidas || 0), 0) / totalDiasRegistrados;
  const mediaProteina = logsNutrition.reduce((acc, curr) => acc + (curr.proteina || 0), 0) / totalDiasRegistrados;

  const taxaTreino = (diasComTreino / totalDays) * 100;
  const tdeeEstimado = Math.round(pesoAtual * 24 * 1.375); // Estimativa padrão

  const pontosFortes: string[] = [];
  const melhorias: string[] = [];

  if (mediaAgua >= 2000) {
    pontosFortes.push(`Hidratação consistente: média diária de ${Math.round(mediaAgua)}ml.`);
  } else {
    melhorias.push("Aumentar ingestão de água para otimizar a síntese proteica e performance nos treinos.");
  }

  if (taxaTreino >= 60) {
    pontosFortes.push(`Excelente consistência nos treinos: completou ${diasComTreino} sessões.`);
  } else {
    melhorias.push("Tentar aumentar a frequência semanal de treinos para evitar platôs de desempenho.");
  }

  if (mediaProteina >= pesoAtual * 1.5) {
    pontosFortes.push(`Meta de ingestão de proteínas cumprida com média de ${Math.round(mediaProteina)}g.`);
  } else {
    melhorias.push("Elevar o consumo proteico para melhorar a hipertrofia e recuperação muscular.");
  }

  const conteudo = `
### 📊 Relatório de Desempenho Físico (Análise Algorítmica)

Com base nos dados coletados nos últimos **${totalDays} dias**, seu comportamento físico e nutricional foi mapeado com **${taxaTreino.toFixed(0)}% de consistência de treino**.

#### 🎯 Diagnóstico de Hábitos
* **Consumo Calórico Médio:** ${Math.round(mediaCalorias)} kcal/dia.
* **Consumo Proteico Médio:** ${Math.round(mediaProteina)}g/dia.
* **Frequência de Musculação:** Completou **${diasComTreino}** treinos.
* **Hidratação Média:** ${Math.round(mediaAgua)} ml/dia.

#### 📈 Previsão de Evolução e TDEE
Seu **TDEE Dinâmico** calculado para manutenção é de aproximadamente **${tdeeEstimado} kcal**. Mantendo o atual balanço energético de **${Math.round(mediaCalorias)} kcal/dia**, a tendência do seu peso corporal é de **${mediaCalorias > tdeeEstimado ? "superavit (ganho ponderal)" : "deficit (perda ponderal)"}**.
  `.trim();

  return {
    conteudo,
    insightsObj: {
      pontosFortes,
      melhorias,
      previsaoTdee: tdeeEstimado
    }
  };
}
