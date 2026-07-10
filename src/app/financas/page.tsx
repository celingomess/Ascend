import React from "react";
import prisma from "@/lib/prisma";
import FinancasClientInitial from "@/components/FinancasClientInitial";

export const revalidate = 0; // Garantir dados em tempo real do banco MySQL

export default async function FinancasPage() {
  // 1. Obter Usuário Padrão ID=1
  const user = await prisma.users.findUnique({
    where: { id: 1 },
  });

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="ascend-title text-danger">Usuário padrão não encontrado.</h2>
        <p className="text-muted">Por favor, verifique a conexão com o banco MySQL.</p>
      </div>
    );
  }

  // 2. Obter transações do usuário
  const transactions = await prisma.financial_transactions.findMany({
    where: { user_id: user.id },
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  // 3. Cálculos de Saldo e Totais do Mês Corrente
  const saldoTotal = transactions.reduce((acc, t) => acc + (t.valor ?? 0), 0);

  const hoje = new Date();
  const currentMonth = hoje.getMonth();
  const currentYear = hoje.getFullYear();

  const transactionsMonth = transactions.filter((t) => {
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

  // 4. Distribuição por categorias para o gráfico
  const categoriasDict: Record<string, number> = {};
  transactions.forEach((t) => {
    if ((t.valor ?? 0) < 0) {
      const cat = t.categoria || "Outros";
      categoriasDict[cat] = (categoriasDict[cat] || 0) + Math.abs(t.valor ?? 0);
    }
  });

  const dadosCategorias = {
    labels: Object.keys(categoriasDict),
    valores: Object.values(categoriasDict),
  };

  return (
    <FinancasClientInitial
      user={user}
      initialTransactions={transactions}
      initialSaldoTotal={saldoTotal}
      initialEntradasMes={entradasMes}
      initialSaidasMes={Math.abs(saidasMes)}
      initialDadosCategorias={dadosCategorias}
    />
  );
}
