import { Router } from "express";
import { z } from "zod";
import { findCategory } from "../categories/routes.js";
import { prisma } from "../db.js";
import { HttpError, notFound } from "../errors.js";
import { currentMonth, monthRange } from "../lib/dates.js";
import { idParam, month, positiveCents } from "../lib/validation.js";

const putSchema = z.object({ categoryId: z.string().min(1), month, limit: positiveCents });

export const budgetsRouter = Router();

budgetsRouter.get("/", async (req, res) => {
  const m = month.default(currentMonth()).parse(req.query.month);
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId, month: m },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { category: { name: "asc" } },
  });
  const spent = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId: req.userId,
      kind: "EXPENSE",
      date: monthRange(m),
      categoryId: { in: budgets.map((b) => b.categoryId) },
    },
    _sum: { amount: true },
  });
  const spentBy = new Map(spent.map((s) => [s.categoryId, s._sum.amount ?? 0]));
  res.json(budgets.map(({ userId: _u, ...b }) => ({ ...b, spent: spentBy.get(b.categoryId) ?? 0 })));
});

budgetsRouter.put("/", async (req, res) => {
  const data = putSchema.parse(req.body);
  const category = await findCategory(req.userId, data.categoryId);
  if (category.kind !== "EXPENSE") throw new HttpError(400, "Orçamentos só valem para categorias de despesa");
  const budget = await prisma.budget.upsert({
    where: { categoryId_month: { categoryId: data.categoryId, month: data.month } },
    create: { ...data, userId: req.userId },
    update: { limit: data.limit },
  });
  res.json(budget);
});

budgetsRouter.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { count } = await prisma.budget.deleteMany({ where: { id, userId: req.userId } });
  if (!count) throw notFound();
  res.status(204).end();
});
