"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Declaração de ferramentas (Tool Calling) para o Gemini 2.5 Flash
const copilotTools = [
  {
    functionDeclarations: [
      {
        name: "add_expense",
        description: "Registra uma transação financeira (despesa de Saída ou receita de Entrada) no módulo de Finanças.",
        parameters: {
          type: "OBJECT",
          properties: {
            valor: { type: "NUMBER", description: "Valor em Reais (ex: 85.50)" },
            tipo: { type: "STRING", description: "Saída (despesa) ou Entrada (receita)" },
            categoria: { type: "STRING", description: "Alimentação, Moradia, Transporte, Lazer, Saúde, Educação, Investimentos, Outros" },
            descricao: { type: "STRING", description: "Descrição curta do gasto ou receita" },
          },
          required: ["valor", "tipo", "categoria", "descricao"],
        },
      },
      {
        name: "add_meal",
        description: "Registra um alimento ou refeição consumida com estimativa nutricional no módulo de Saúde.",
        parameters: {
          type: "OBJECT",
          properties: {
            alimento: { type: "STRING", description: "Nome do alimento ou refeição" },
            calorias: { type: "NUMBER", description: "Calorias estimadas em kcal" },
            proteina: { type: "NUMBER", description: "Proteínas em gramas" },
            carboidrato: { type: "NUMBER", description: "Carboidratos em gramas" },
            gordura: { type: "NUMBER", description: "Gordura em gramas" },
          },
          required: ["alimento", "calorias"],
        },
      },
      {
        name: "create_goal",
        description: "Cria uma nova Jornada (Meta) no módulo de Metas.",
        parameters: {
          type: "OBJECT",
          properties: {
            titulo: { type: "STRING", description: "Título da jornada" },
            categoria: { type: "STRING", description: "Carreira, Estudos, Saúde, Projetos, Finanças, Pessoal" },
            descricao: { type: "STRING", description: "Descrição ou objetivo da jornada" },
          },
          required: ["titulo", "categoria"],
        },
      },
    ],
  },
];

/**
 * Processa a mensagem enviada ao Copilot Flutuante usando Function Calling
 */
export async function processCopilotCommandAction(prompt: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : 1;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        reply: "⚠️ Chave da API do Gemini não configurada no servidor.",
      };
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });

    const systemInstruction = `Você é o Ascend AI Copilot, a inteligência central do sistema operacional de evolução pessoal Ascend OS.
Usuário: ${user?.nome || "Marcelo"} (Nível ${user?.nivel || 1}, ${user?.xp_total || 0} XP).
Seu papel é responder dúvidas ou usar as ferramentas (Tools) para realizar mutações no banco de dados do usuário quando ele pedir ações de Finanças, Saúde ou Metas.
Seja conciso, direto, motivador e amigável.`;

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: copilotTools as any,
      systemInstruction,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls();

    // Se a IA decidiu chamar uma ferramenta
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const args = call.args as any;

      if (call.name === "add_expense") {
        const dataHoje = new Date();
        await prisma.financial_transactions.create({
          data: {
            user_id: userId,
            valor: args.valor,
            tipo: args.tipo === "Entrada" ? "Entrada" : "Saída",
            categoria: args.categoria || "Outros",
            descricao: args.descricao || "Registrado via Copilot",
            data: dataHoje,
          },
        });

        return {
          success: true,
          actionExecuted: "add_expense",
          reply: `✅ Transação de **R$ ${args.valor.toFixed(2)}** (${args.tipo}) registrada com sucesso na categoria **${args.categoria}**!`,
        };
      }

      if (call.name === "add_meal") {
        const hojeStr = new Date();
        hojeStr.setHours(0, 0, 0, 0);

        let nutrition = await prisma.daily_nutrition.findFirst({
          where: { user_id: userId, data: hojeStr },
        });

        if (!nutrition) {
          nutrition = await prisma.daily_nutrition.create({
            data: {
              user_id: userId,
              data: hojeStr,
              calorias_consumidas: 0,
              calorias_meta: 2000,
              proteina: 0,
              carboidrato: 0,
              gordura: 0,
              agua_ml: 0,
            },
          });
        }

        const proteina = args.proteina || 0;
        const carboidrato = args.carboidrato || 0;
        const gordura = args.gordura || 0;
        const calorias = args.calorias || proteina * 4 + carboidrato * 4 + gordura * 9;

        await prisma.daily_nutrition.update({
          where: { id: nutrition.id },
          data: {
            calorias_consumidas: (nutrition.calorias_consumidas || 0) + Math.round(calorias),
            proteina: (nutrition.proteina || 0) + Math.round(proteina),
            carboidrato: (nutrition.carboidrato || 0) + Math.round(carboidrato),
            gordura: (nutrition.gordura || 0) + Math.round(gordura),
          },
        });

        return {
          success: true,
          actionExecuted: "add_meal",
          reply: `🥗 **${args.alimento}** (${Math.round(calorias)} kcal) adicionado ao seu diário de saúde!`,
        };
      }

      if (call.name === "create_goal") {
        const novaMeta = await prisma.goals.create({
          data: {
            user_id: userId,
            titulo: args.titulo,
            categoria: args.categoria || "Geral",
            progresso: 0,
            status: "Em andamento",
            data_inicio: new Date(),
          },
        });

        return {
          success: true,
          actionExecuted: "create_goal",
          reply: `🚀 Nova jornada **"${args.titulo}"** criada com sucesso na categoria **${args.categoria}**!`,
        };
      }
    }

    // Se for uma resposta normal de texto
    const textReply = response.text();
    return {
      success: true,
      reply: textReply || "Entendido! Como posso ajudar na sua evolução hoje?",
    };
  } catch (error: any) {
    console.error("Erro no Ascend Copilot Action:", error);
    return {
      success: false,
      reply: `⚠️ Ocorreu um erro ao processar o comando: ${error.message || "Erro interno."}`,
    };
  }
}
