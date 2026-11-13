import type { Tx } from "../db.js";

export const DEFAULT_CATEGORIES = [
  { name: "Alimentação", color: "#f97316", kind: "EXPENSE" },
  { name: "Moradia", color: "#6366f1", kind: "EXPENSE" },
  { name: "Transporte", color: "#0ea5e9", kind: "EXPENSE" },
  { name: "Saúde", color: "#ef4444", kind: "EXPENSE" },
  { name: "Lazer", color: "#ec4899", kind: "EXPENSE" },
  { name: "Educação", color: "#8b5cf6", kind: "EXPENSE" },
  { name: "Compras", color: "#eab308", kind: "EXPENSE" },
  { name: "Outros", color: "#64748b", kind: "EXPENSE" },
  { name: "Salário", color: "#22c55e", kind: "INCOME" },
  { name: "Freelance", color: "#14b8a6", kind: "INCOME" },
  { name: "Investimentos", color: "#84cc16", kind: "INCOME" },
  { name: "Outros", color: "#94a3b8", kind: "INCOME" },
] as const;

export async function createUserWithDefaults(
  tx: Tx,
  data: { name: string; email: string; passwordHash: string; isGuest?: boolean },
) {
  const user = await tx.user.create({ data });
  await tx.category.createMany({ data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })) });
  return user;
}
