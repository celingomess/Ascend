import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    let val = 0;
    let desc = "";
    let cat = "Outros";

    if (formData.has("quick_log")) {
      const quickText = (formData.get("quick_log") as string || "").trim();
      const parsed = parseQuickLog(quickText);
      if (parsed.val === null || parsed.desc === null || parsed.cat === null) {
        return NextResponse.json(
          {
            success: false,
            message: "Formato de log rápido inválido. Use ex: '-32 Almoço' ou '+500 Pix'",
          },
          { status: 400 }
        );
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
      return NextResponse.json({ success: false, message: "A descrição é obrigatória." }, { status: 400 });
    }

    const dataStr = formData.get("data") as string;
    let dataT = new Date();
    if (dataStr) {
      dataT = new Date(dataStr + "T00:00:00");
    }

    // Criar transação no banco
    const transaction = await prisma.financial_transactions.create({
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
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
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

    await prisma.users.update({
      where: { id: 1 },
      data: {
        xp_total: novoXp,
        nivel: novoNivel,
        ultima_atividade: new Date(),
      },
    });

    // Recalcular resumos do mês
    const allTransactions = await prisma.financial_transactions.findMany({
      where: { user_id: 1 },
    });

    const saldoTotal = allTransactions.reduce((acc, t) => acc + (t.valor ?? 0), 0);
    const hoje = new Date();
    const currentMonth = hoje.getMonth();
    const currentYear = hoje.getFullYear();

    const transactionsMonth = allTransactions.filter((t) => {
      if (!t.data) return false;
      const d = new Date(t.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const entradasMes = transactionsMonth
      .filter((t) => (t.valor ?? 0) > 0)
      .reduce((acc, t) => acc + (t.valor ?? 0), 0);
    const saidasMes = transactionsMonth
      .filter((t) => (t.valor ?? 0) < 0)
      .reduce((acc, t) => acc + (t.valor ?? 0), 0);

    return NextResponse.json({
      success: true,
      valor: val,
      descricao: desc,
      categoria: cat,
      data: `${String(dataT.getDate()).padStart(2, "0")}/${String(dataT.getMonth() + 1).padStart(
        2,
        "0"
      )}/${dataT.getFullYear()}`,
      saldo_total: saldoTotal,
      entradas_mes: entradasMes,
      saidas_mes: Math.abs(saidasMes),
      xp_ganho: xpGanho,
      usuario_xp: novoXp,
      usuario_nivel: novoNivel,
      nivel_subiu: nivelSubiu,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
