import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import MetasEditForm from "@/components/MetasEditForm";

interface EditJornadaPageProps {
  params: { goal_id: string };
}

export default async function EditJornadaPage({ params }: EditJornadaPageProps) {
  const goalId = parseInt(params.goal_id, 10);

  if (isNaN(goalId)) {
    return notFound();
  }

  const goal = await prisma.goals.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    return notFound();
  }

  // Format Date for HTML Input value (YYYY-MM-DD)
  const formattedGoal = {
    ...goal,
    prazoFormatted: goal.prazo ? goal.prazo.toISOString().substring(0, 10) : "",
  };

  return <MetasEditForm goal={formattedGoal} />;
}
