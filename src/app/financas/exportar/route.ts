import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }
    const userId = session.user.id;

    const transactions = await prisma.financial_transactions.findMany({
      where: { user_id: userId },
      orderBy: { data: "desc" },
    });

    const headers = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = transactions.map((t) => {
      const dataStr = t.data ? t.data.toISOString().split("T")[0] : "";
      const valorStr = t.valor ? t.valor.toFixed(2) : "0.00";
      return [
        dataStr,
        t.descricao || "",
        t.categoria || "",
        valorStr
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(";");
    });

    const csvContent = "\ufeff" + headers.join(";") + "\n" + rows.join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="extrato-ascend.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
