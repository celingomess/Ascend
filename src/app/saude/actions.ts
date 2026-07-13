"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { updateUserStreak } from "@/lib/streaks";

export async function generateHealthReportAction(tipo: "SEMANAL" | "MENSAL" | "TREINO") {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "Não autorizado." };
    }
    const userId = session.user.id;

    // Calcular o intervalo de datas
    const hoje = new Date();
    const diasAtras = tipo === "SEMANAL" ? 7 : (tipo === "MENSAL" ? 30 : 60);
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

    // 4. Buscar histórico de cargas
    const loadHistory = await prisma.workout_exercise_history.findMany({
      where: {
        user_id: userId,
        data_registro: { gte: dataLimite },
      },
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

        const prompt = tipo === "TREINO" ? `
Você é o Coach de Musculação com IA do Ascend OS. Analise o histórico de treinos e cargas do usuário nos últimos ${diasAtras} dias:
- Peso atual: ${pesoAtual} kg
- Histórico de peso registrado: ${JSON.stringify(logsWeights)}
- Treinos concluídos: ${JSON.stringify(logsWorkouts)}
- Cargas progressivas registradas nos exercícios: ${JSON.stringify(loadHistory)}

Gere um relatório focado em desempenho, musculação e progressão de força em Markdown.
O relatório deve conter:
1. Uma análise de consistência e frequência de treinos concluídos.
2. Análise da curva de progressão de carga (Progressive Overload) com base nos registros fornecidos.
3. Recomendações práticas específicas de periodização, aumento de cargas nos exercícios e ajustes de volume de treino (séries e repetições).

Além do relatório em Markdown, forneça um objeto JSON com três chaves:
"pontosFortes" (array de strings), "melhorias" (array de strings) e "previsaoTdee" (número de calorias estimado).

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
        `.trim() : `
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

Além do relatório em Markdown, forneça um objeto JSON com três chaves:
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
        ({ conteudo, insightsObj } = runHeuristicFallback(logsNutrition, logsWorkouts, logsWeights, loadHistory, pesoAtual, diasAtras, tipo));
      }
    } else {
      ({ conteudo, insightsObj } = runHeuristicFallback(logsNutrition, logsWorkouts, logsWeights, loadHistory, pesoAtual, diasAtras, tipo));
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
  loadHistory: any[],
  pesoAtual: number,
  totalDays: number,
  tipo: "SEMANAL" | "MENSAL" | "TREINO"
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

  if (tipo === "TREINO") {
    // Fallback focado em treino
    const totalVolumeCargas = loadHistory.reduce((sum, curr) => sum + curr.carga, 0);
    const mediaCarga = loadHistory.length > 0 ? totalVolumeCargas / loadHistory.length : 0;

    if (diasComTreino >= totalDays * 0.6) {
      pontosFortes.push(`Consistência de treino sólida: completou ${diasComTreino} sessões.`);
    } else {
      melhorias.push("Tentar cumprir pelo menos 3 a 4 treinos semanais para manter estímulo de hipertrofia.");
    }

    if (mediaCarga > 0) {
      pontosFortes.push(`Progressão de carga mapeada com média de força de ${mediaCarga.toFixed(1)} kg por exercício.`);
      pontosFortes.push("Volume de treinamento acumulado foi de " + totalVolumeCargas.toFixed(0) + " kg no período.");
    } else {
      melhorias.push("Lembre-se de registrar as cargas dos seus exercícios na musculação para acompanhar o overload.");
    }

    const conteudo = `
### 🏋️ Relatório de Desempenho e Musculação (Análise Algorítmica)

Análise focada em hipertrofia e progressão de cargas nos últimos **${totalDays} dias**.

#### 🎯 Diagnóstico de Treinos
* **Sessões Realizadas:** ${diasComTreino} treinos concluídos.
* **Consistência de Estímulo:** ${(taxaTreino).toFixed(0)}% de conformidade com o cronograma.
* **Média de Força por Exercício:** ${mediaCarga.toFixed(1)} kg.

#### 📈 Recomendações de Evolução
* **Sobrecarga Progressiva:** Tente aumentar de 1 a 2 kg nos exercícios multiarticulares (como agachamento e supino) na próxima semana, mantendo a faixa de 8-12 repetições.
* **Densidade de Treino:** Mantenha o descanso entre séries estritamente de 90 a 120 segundos para manter a taxa de ativação de fibras do Tipo II.
    `.trim();

    return {
      conteudo,
      insightsObj: {
        pontosFortes,
        melhorias,
        previsaoTdee: tdeeEstimado,
      }
    };
  }

  // Fallback padrão de nutrição/saúde
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

export async function parseExpressMealAction(mealDescription: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "Não autorizado." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: true,
        calorias: 350,
        proteina: 25,
        carboidrato: 45,
        gordura: 8,
        observacao: "Heurística padrão (Sem chave Gemini)."
      };
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Você é o Nutricionista e Analista de Alimentos com IA do Ascend OS.
Sua tarefa é analisar a seguinte descrição de refeição ou alimento digitado pelo usuário: "${mealDescription}"

Estime os valores nutricionais aproximados (calorias em kcal, proteínas em gramas, carboidratos em gramas, gorduras em gramas).
Forneça os valores na descrição mais próxima e plausível baseada em porções médias de consumo.

Você deve responder APENAS com um objeto JSON válido (sem markdown, sem blocos de código \`\`\`) contendo as seguintes propriedades numéricas:
{
  "calorias": 0,
  "proteina": 0,
  "carboidrato": 0,
  "gordura": 0
}
    `.trim();

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    return {
      success: true,
      calorias: parsed.calorias || 0,
      proteina: parsed.proteina || 0,
      carboidrato: parsed.carboidrato || 0,
      gordura: parsed.gordura || 0
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function parseExpressWorkoutAction(workoutText: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "Não autorizado." };
    }
    const userId = session.user.id;

    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponse: {
      nomeTreino: string;
      exercicios: {
        nomeExercicio: string;
        series: number;
        repeticoes: number;
        carga: number;
      }[];
    };

    if (apiKey) {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Você é o motor de IA de alta performance do Ascend OS. 
Sua tarefa é extrair os dados estruturados de um treino escrito em linguagem natural pelo usuário.

Texto do Usuário: "${workoutText}"

Responda ESTRITAMENTE com um objeto JSON válido (sem markdown, sem blocos de código \`\`\`json) seguindo este formato:
{
  "nomeTreino": "Nome sugerido para o grupo muscular ou treino (Ex: Treino de Peito & Tríceps)",
  "exercicios": [
    {
      "nomeExercicio": "Nome do Exercício corrigido e capitalizado",
      "series": 4,
      "repeticoes": 10,
      "carga": 60
    }
  ]
}

Se o usuário omitir repetições ou séries, use 3 ou 10 como padrão razoável. Se omitir a carga, defina como 0.
      `.trim();

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      aiResponse = JSON.parse(text);
    } else {
      aiResponse = {
        nomeTreino: "Treino Rápido (IA Fallback)",
        exercicios: [
          { nomeExercicio: "Supino Reto com IA", series: 4, repeticoes: 10, carga: 50 },
          { nomeExercicio: "Rosca Direta com IA", series: 3, repeticoes: 12, carga: 15 }
        ]
      };
    }

    const xpGanho = 30;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar a rotina base
      const treino = await tx.workouts.create({
        data: {
          user_id: userId,
          nome: aiResponse.nomeTreino,
          dias_semana: "Variado",
          conteudo: `Treino de musculação registrado via texto/voz.`,
          criado_em: new Date(),
        }
      });

      // 2. Criar os exercícios e salvar no histórico de cargas
      let ordem = 1;
      for (const ex of aiResponse.exercicios) {
        await tx.workout_exercises.create({
          data: {
            workout_id: treino.id,
            nome_exercicio: ex.nomeExercicio,
            series: ex.series,
            repeticoes: ex.repeticoes.toString(),
            carga_atual: ex.carga,
            ordem: ordem++,
          }
        });

        await tx.workout_exercise_history.create({
          data: {
            user_id: userId,
            workout_id: treino.id,
            exercise_name: ex.nomeExercicio,
            carga: ex.carga,
            data_registro: new Date(),
          }
        });
      }

      // 3. Registrar a conclusão em logs
      await tx.workout_logs.create({
        data: {
          user_id: userId,
          workout_id: treino.id,
          data_conclusao: new Date(),
        }
      });

      // 4. Registrar Evento de XP
      await tx.user_events.create({
        data: {
          user_id: userId,
          titulo: "Treino com IA Concluído",
          descricao: `Concluiu o treino via texto: ${aiResponse.nomeTreino}`,
          tipo: "saude",
          xp: xpGanho,
          criado_em: new Date(),
        }
      });

      // 5. Atualizar XP e verificar Level Up
      const user = await tx.users.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      let novoXp = (user.xp_total ?? 0) + xpGanho;
      let novoNivel = user.nivel ?? 1;
      let nivelSubiu = false;

      while (novoXp >= novoNivel * 500) {
        novoNivel += 1;
      }

      if (novoNivel > user.nivel!) {
        nivelSubiu = true;
      }

      await tx.users.update({
        where: { id: userId },
        data: {
          xp_total: novoXp,
          nivel: novoNivel,
        }
      });

      await updateUserStreak(userId, tx);

      return {
        success: true,
        mensagem: `Treino "${aiResponse.nomeTreino}" registrado!`,
        xp_ganho: xpGanho,
        usuario_xp: novoXp,
        usuario_nivel: novoNivel,
        nivel_subiu: nivelSubiu,
      };
    });

    revalidatePath("/saude");
    revalidatePath("/saude/evolucao");
    return resultado;
  } catch (error: any) {
    return { success: false, message: "Erro ao registrar treino por texto: " + error.message };
  }
}
