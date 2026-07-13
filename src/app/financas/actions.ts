'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Função de parsing do comando de log rápido
function parseQuickLog(text: string) {
  text = text.trim();
  const parts = text.split(" ");
  if (parts.length < 2) {
    return { val: null, desc: null, cat: null };
  }

  let valStr = parts[0];
  const desc = parts.slice(1).join(" ");

  const isIncome = valStr.startsWith("+");
  const isExpense = valStr.startsWith("-");

  if (isIncome || isExpense) {
    valStr = valStr.slice(1);
  }

  let val = parseFloat(valStr);
  if (isNaN(val)) {
    return { val: null, desc: null, cat: null };
  }

  if (isExpense || (!isIncome && !isExpense)) {
    val = -val;
  }

  const descLower = desc.toLowerCase();
  let category = "Outros";

  if (
    ["almoço", "jantar", "ifood", "mercado", "padaria", "comida", "restaurante", "pizza", "burger", "lanche"].some(
      (k) => descLower.includes(k)
    )
  ) {
    category = "Alimentação";
  } else if (
    ["uber", "combustível", "gasolina", "metrô", "ônibus", "passagem", "pedágio", "carro", "moto"].some(
      (k) => descLower.includes(k)
    )
  ) {
    category = "Transporte";
  } else if (
    ["cinema", "bar", "show", "ingresso", "viagem", "cerveja", "festa", "balada", "jogo"].some((k) =>
      descLower.includes(k)
    )
  ) {
    category = "Lazer";
  } else if (
    ["aluguel", "luz", "água", "energia", "internet", "net", "condomínio", "gás"].some((k) =>
      descLower.includes(k)
    )
  ) {
    category = "Moradia";
  } else if (
    ["salário", "freela", "renda", "pix", "recebido", "venda", "dividendos"].some((k) =>
      descLower.includes(k)
    )
  ) {
    category = "Receita";
    val = Math.abs(val);
  } else if (
    ["investimento", "ações", "tesouro", "fundo", "poupança", "cdb", "cripto"].some((k) =>
      descLower.includes(k)
    )
  ) {
    category = "Investimentos";
  } else if (
    ["remédio", "farmácia", "médico", "consulta", "dentista", "saúde"].some((k) =>
      descLower.includes(k)
    )
  ) {
    category = "Saúde";
  }

  return { val, desc, cat: category };
}

export async function addTransactionAction(formData: FormData) {
  try {
    let val = 0;
    let desc = "";
    let cat = "Outros";

    if (formData.has("quick_log")) {
      const quickText = (formData.get("quick_log") as string || "").trim();
      const parsed = parseQuickLog(quickText);
      if (parsed.val === null || parsed.desc === null || parsed.cat === null) {
        return {
          success: false,
          message: "Formato de log rápido inválido. Use ex: '-32 Almoço' ou '+500 Pix'",
        };
      }
      val = parsed.val;
      desc = parsed.desc;
      cat = parsed.cat;
    } else {
      val = parseFloat(formData.get("valor") as string || "0");
      const tipo = formData.get("tipo") as string || "saida";
      if (tipo === "saida" && val > 0) {
        val = -val;
      } else if (tipo === "entrada" && val < 0) {
        val = -val;
      }

      desc = (formData.get("descricao") as string || "").trim();
      cat = formData.get("categoria") as string || "Outros";
    }

    if (!desc) {
      return { success: false, message: "A descrição é obrigatória." };
    }

    const dataStr = formData.get("data") as string;
    let dataT = new Date();
    if (dataStr) {
      dataT = new Date(dataStr + "T00:00:00");
    }

    // Criar transação no banco
    await prisma.financial_transactions.create({
      data: {
        user_id: 1,
        valor: val,
        descricao: desc,
        categoria: cat,
        data: dataT,
      },
    });

    const xpGanho = 5;

    // Registrar Evento
    const tipoStr = val > 0 ? "entrada" : "saída";
    await prisma.user_events.create({
      data: {
        user_id: 1,
        titulo: "Finanças Atualizadas",
        descricao: `Registrou ${tipoStr} de R$ ${Math.abs(val).toFixed(2)} - ${desc}`,
        tipo: "financas",
        xp: xpGanho,
        criado_em: new Date(),
      },
    });

    // Gamificação: Usuário
    const user = await prisma.users.findUnique({ where: { id: 1 } });
    if (!user) {
      return { success: false, message: "Usuário padrão não encontrado." };
    }

    const oldLevel = user.nivel ?? 1;
    let novoXp = (user.xp_total ?? 0) + xpGanho;
    let novoNivel = oldLevel;
    let nivelSubiu = false;

    while (novoXp >= novoNivel * 500) {
      novoNivel += 1;
    }

    if (novoNivel > oldLevel) {
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

    // Revalidar a rota de finanças para recarregar todos os dados no Server Component
    revalidatePath("/financas");

    return {
      success: true,
      valor: val,
      descricao: desc,
      categoria: cat,
      nivelSubiu,
      nivelAnterior: oldLevel,
      nivelNovo: novoNivel,
      xpGanho,
    };
  } catch (error: any) {
    return { success: false, message: "Erro interno no servidor: " + error.message };
  }
}

export async function deleteTransactionAction(id: number) {
  try {
    await prisma.financial_transactions.delete({
      where: { id },
    });

    // Revalidar a rota de finanças para recarregar todos os dados no Server Component
    revalidatePath("/financas");

    return { success: true };
  } catch (error: any) {
    return { success: false, message: "Erro ao deletar transação: " + error.message };
  }
}
