import type { Tx } from "../db.js";
import { addMonths, currentMonth, toDbDate } from "../lib/dates.js";

/** Small seeded PRNG (mulberry32): realistic-looking but reproducible data per user. */
function rng(seed: string) {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type AccountKey = "checking" | "card" | "cash";
const EXPENSES: Record<string, { desc: string[]; min: number; max: number; perMonth: number; account: AccountKey }> = {
  Alimentação: { desc: ["Supermercado", "Padaria", "iFood", "Restaurante", "Feira"], min: 1500, max: 32000, perMonth: 9, account: "card" },
  Transporte: { desc: ["Uber", "Combustível", "Estacionamento", "Metrô"], min: 800, max: 25000, perMonth: 6, account: "card" },
  Lazer: { desc: ["Cinema", "Streaming", "Show", "Bar com amigos"], min: 2000, max: 18000, perMonth: 3, account: "card" },
  Saúde: { desc: ["Farmácia", "Consulta", "Academia"], min: 3000, max: 25000, perMonth: 2, account: "checking" },
  Compras: { desc: ["Roupas", "Eletrônicos", "Presente", "Casa"], min: 4000, max: 60000, perMonth: 2, account: "card" },
  Educação: { desc: ["Curso online", "Livros"], min: 3000, max: 20000, perMonth: 1, account: "checking" },
  Outros: { desc: ["Café", "Lanche", "Diversos"], min: 500, max: 3000, perMonth: 3, account: "cash" },
};

type Row = {
  userId: string;
  accountId: string;
  categoryId: string;
  kind: "INCOME" | "EXPENSE";
  amount: number;
  date: Date;
  description: string;
};

export async function seedGuestData(tx: Tx, userId: string) {
  const rand = rng(userId);
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const cats = Object.fromEntries(
    (await tx.category.findMany({ where: { userId } })).map((c) => [`${c.kind}:${c.name}`, c.id]),
  );

  const checking = await tx.account.create({ data: { userId, name: "Conta Corrente", type: "CHECKING", initialBalance: 250000 } });
  const savings = await tx.account.create({ data: { userId, name: "Poupança", type: "SAVINGS", initialBalance: 1500000 } });
  const card = await tx.account.create({ data: { userId, name: "Cartão de Crédito", type: "CREDIT_CARD", initialBalance: 0 } });
  const cash = await tx.account.create({ data: { userId, name: "Carteira", type: "CASH", initialBalance: 15000 } });
  const accountId: Record<AccountKey, string> = { checking: checking.id, card: card.id, cash: cash.id };

  const thisMonth = currentMonth();
  const today = new Date().getUTCDate();
  const rows: Row[] = [];

  for (let i = 5; i >= 0; i--) {
    const month = addMonths(thisMonth, -i);
    const lastDay = month === thisMonth ? today : 28; // no future-dated transactions
    const add = (kind: Row["kind"], cat: string, acc: string, amount: number, d: number, description: string) =>
      rows.push({
        userId,
        accountId: acc,
        categoryId: cats[`${kind}:${cat}`],
        kind,
        amount,
        date: toDbDate(`${month}-${String(Math.min(d, lastDay)).padStart(2, "0")}`),
        description,
      });

    add("INCOME", "Salário", checking.id, 650000, 5, "Salário");
    add("INCOME", "Investimentos", savings.id, between(9000, 14000), 1, "Rendimento poupança");
    if (rand() < 0.5) add("INCOME", "Freelance", checking.id, between(80000, 250000), between(1, 28), "Projeto freelance");
    add("EXPENSE", "Moradia", checking.id, 180000, 10, "Aluguel");
    add("EXPENSE", "Moradia", checking.id, between(18000, 32000), 12, "Conta de luz");
    add("EXPENSE", "Moradia", checking.id, 11990, 15, "Internet");

    for (const [cat, cfg] of Object.entries(EXPENSES)) {
      const count = Math.max(1, Math.round(cfg.perMonth * (0.7 + rand() * 0.6)));
      for (let k = 0; k < count; k++) {
        const desc = cfg.desc[Math.floor(rand() * cfg.desc.length)];
        add("EXPENSE", cat, accountId[cfg.account], between(cfg.min, cfg.max), between(1, 28), desc);
      }
    }
  }
  await tx.transaction.createMany({ data: rows });

  const budgets: Record<string, number> = { Alimentação: 120000, Transporte: 60000, Lazer: 40000, Compras: 50000 };
  await tx.budget.createMany({
    data: Object.entries(budgets).map(([cat, limit]) => ({
      userId,
      categoryId: cats[`EXPENSE:${cat}`],
      month: thisMonth,
      limit,
    })),
  });
}
