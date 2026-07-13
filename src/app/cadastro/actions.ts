"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUserAction(formData: FormData) {
  try {
    const nome = (formData.get("nome") as string || "").trim();
    const email = (formData.get("email") as string || "").trim().toLowerCase();
    const password = (formData.get("password") as string || "");

    if (!nome || !email || !password) {
      return { success: false, message: "Todos os campos são obrigatórios." };
    }

    if (password.length < 6) {
      return { success: false, message: "A senha deve conter no mínimo 6 caracteres." };
    }

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: "Este email já está cadastrado." };
    }

    const senhaHash = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        nome,
        email,
        senha_hash: senhaHash,
        nivel: 1,
        xp_total: 0,
        streak_atual: 0,
        melhor_streak: 0,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, message: "Erro ao cadastrar usuário: " + error.message };
  }
}
