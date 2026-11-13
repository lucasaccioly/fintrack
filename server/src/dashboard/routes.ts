import { Router } from "express";
import { balancesByAccount } from "../accounts/routes.js";
import { prisma } from "../db.js";
import { addMonths, currentMonth, monthRange } from "../lib/dates.js";
import { month } from "../lib/validation.js";
import { serialize } from "../transactions/routes.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res) => {
  const userId = req.userId;
  const m = month.default(currentMonth()).parse(req.query.month);
  const range = monthRange(m);
  const first = addMonths(m, -11);

  const [accounts, balances, monthSums, byCategory, history, recent, categories] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { initialBalance: true } }),
    balancesByAccount(userId),
    prisma.transaction.groupBy({ by: ["kind"], where: { userId, date: range }, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, kind: "EXPENSE", date: range },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.$queryRaw<{ month: string; kind: "INCOME" | "EXPENSE"; total: bigint }[]>`
      SELECT to_char("date", 'YYYY-MM') AS month, "kind", SUM("amount") AS total
      FROM "Transaction"
      WHERE "userId" = ${userId} AND "date" >= ${monthRange(first).gte} AND "date" < ${range.lt}
      GROUP BY 1, 2`,
    prisma.transaction.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ]);

  const sum = (k: string) => monthSums.find((s) => s.kind === k)?._sum.amount ?? 0;
  const catById = new Map(categories.map((c) => [c.id, c]));
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const mm = addMonths(first, i);
    const pick = (k: string) => Number(history.find((h) => h.month === mm && h.kind === k)?.total ?? 0);
    return { month: mm, income: pick("INCOME"), expense: pick("EXPENSE") };
  });

  res.json({
    totalBalance:
      accounts.reduce((acc, a) => acc + a.initialBalance, 0) + [...balances.values()].reduce((a, b) => a + b, 0),
    monthIncome: sum("INCOME"),
    monthExpense: sum("EXPENSE"),
    byCategory: byCategory.map((c) => ({
      categoryId: c.categoryId,
      name: catById.get(c.categoryId)?.name ?? "?",
      color: catById.get(c.categoryId)?.color ?? "#64748b",
      total: c._sum.amount ?? 0,
    })),
    last12Months,
    recent: recent.map(serialize),
  });
});
