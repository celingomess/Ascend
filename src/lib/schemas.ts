import { z } from "zod";

export const TransactionSchema = z.object({
  valor: z.number({ invalid_type_error: "Valor deve ser um número" }),
  descricao: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres").max(100, "Descrição muito longa"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  data: z.preprocess((val) => (val ? new Date(val as string) : new Date()), z.date()),
});

export const BudgetSchema = z.object({
  categoria: z.string().min(1, "Categoria é obrigatória"),
  limite: z.number().nonnegative("Limite deve ser um valor maior ou igual a zero"),
});

export const NutritionSchema = z.object({
  calorias: z.number().int().nonnegative("Calorias deve ser um valor não negativo"),
  proteina: z.number().int().nonnegative("Proteínas deve ser um valor não negativo"),
  carboidrato: z.number().int().nonnegative("Carboidratos deve ser um valor não negativo"),
  gordura: z.number().int().nonnegative("Gorduras deve ser um valor não negativo"),
  agua: z.number().int().nonnegative("Água deve ser um valor não negativo"),
});

export const WeightSchema = z.object({
  peso: z.number().positive("Peso deve ser um valor positivo"),
});
