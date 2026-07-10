import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { transaction_id: string } }
) {
  try {
    const transactionId = parseInt(params.transaction_id, 10);
    await prisma.financial_transactions.delete({
      where: { id: transactionId },
    });
  } catch (error) {}

  return NextResponse.redirect(new URL("/financas", req.url), 303);
}
