"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateUserStreak } from "@/lib/streaks";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper para gerar conteúdo com retry automático e fallback de modelos
async function generateContentWithFallback(ai: any, prompt: string) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
  let lastError = null;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`[IA Warning] Tentativa ${attempt} com o modelo ${modelName} falhou: ${err.message}`);
        if (err.status === 503 || err.message?.includes("503") || err.message?.includes("demand") || err.message?.includes("Unavailable")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Falha na geração de conteúdo da IA após múltiplas tentativas.");
}

/**
 * Salva a sessão de foco no banco de dados e atribui XP se concluída
 */
export async function salvarSessaoFocoAction(data: {
  duracao_minutos: number;
  categoria: string;
  titulo_tarefa?: string;
  goal_id?: number;
  status: "CONCLUIDA" | "INTERROMPIDA";
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : 1;

    let xpGanho = 0;
    if (data.status === "CONCLUIDA") {
      // 25 min = 15 XP
      xpGanho = Math.max(10, Math.round(data.duracao_minutos * 0.6));
    }

    // 1. Criar registro na tabela focus_sessions
    const focusRecord = await prisma.focus_sessions.create({
      data: {
        user_id: userId,
        duracao_minutos: data.duracao_minutos,
        categoria: data.categoria || "Geral",
        titulo_tarefa: data.titulo_tarefa || null,
        goal_id: data.goal_id || null,
        xp_ganho: xpGanho,
        status: data.status,
      },
    });

    if (data.status === "CONCLUIDA") {
      // 2. Criar evento de XP
      await prisma.user_events.create({
        data: {
          user_id: userId,
          titulo: `Bloco de Foco Concluído (${data.duracao_minutos} min)`,
          descricao: data.titulo_tarefa
            ? `Tarefa: ${data.titulo_tarefa} [${data.categoria}]`
            : `Sessão de foco na categoria ${data.categoria}`,
          tipo: "FOCO",
          xp: xpGanho,
        },
      });

      // 3. Atualizar XP do Usuário
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (user) {
        const novoXp = (user.xp_total || 0) + xpGanho;
        const novoNivel = Math.floor(novoXp / 500) + 1;

        await prisma.users.update({
          where: { id: userId },
          data: {
            xp_total: novoXp,
            nivel: novoNivel,
            ultima_atividade: new Date(),
          },
        });
      }

      // 4. Atualizar streak de consistência
      await updateUserStreak(userId);
    }

    return { success: true, xp_ganho: xpGanho, session: focusRecord };
  } catch (error: any) {
    console.error("Erro ao salvar sessão de foco:", error);
    return { success: false, error: error.message || "Erro interno ao registrar foco." };
  }
}

/**
 * Utiliza o Gemini 2.5 Flash para sugerir as 3 maiores prioridades de foco com base nas metas ativas
 */
export async function sugerirPrioridadesIaAction() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : 1;

    // Buscar metas em andamento
    const metas = await prisma.goals.findMany({
      where: { user_id: userId, status: { not: "Concluída" } },
      take: 5,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Chave da API do Gemini não configurada no .env",
      };
    }

    const prompt = `Você é o assistente de inteligência e produtividade do Ascend OS.
Analise a lista de jornadas ativas do usuário abaixo e recomende exatamente 3 tarefas/ações de alto impacto para ele realizar no seu próximo bloco de Foco Profundo de 25 minutos.

Jornadas do Usuário:
${JSON.stringify(metas.map((m) => ({ id: m.id, titulo: m.titulo, categoria: m.categoria, progresso: m.progresso })))}

Responda ESTRITAMENTE em formato JSON com o seguinte esquema:
[
  {
    "titulo": "Nome curto e direto da ação",
    "categoria": "Carreira | Estudos | Projetos | Pessoal | Finanças",
    "por_que": "Motivo rápido do impacto dessa ação nas metas",
    "duracao_sugerida": 25
  }
]`;

    const ai = new GoogleGenerativeAI(apiKey);
    const result = await generateContentWithFallback(ai, prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Resposta da IA não continha um array JSON válido.");
    }

    const prioridades = JSON.parse(jsonMatch[0]);
    return { success: true, prioridades };
  } catch (error: any) {
    console.error("Erro ao gerar prioridades por IA:", error);
    return { success: false, error: error.message || "Erro ao consultar a IA." };
  }
}
