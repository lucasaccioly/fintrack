import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError, notFound } from "../errors.js";
import { cents, idParam } from "../lib/validation.js";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "CASH"]),
  initialBalance: cents.default(0),
});

export async function findAccount(userId: string, id: string) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw notFound();
  return account;
}

/** Map accountId -> (incomes - expenses), computed in SQL. */
export async function balancesByAccount(userId: string) {
  const sums = await prisma.transaction.groupBy({
    by: ["accountId", "kind"],
    where: { userId },
    _sum: { amount: true },
  });
  const map = new Map<string, number>();
  for (const s of sums) {
    const signed = (s._sum.amount ?? 0) * (s.kind === "INCOME" ? 1 : -1);
    map.set(s.accountId, (map.get(s.accountId) ?? 0) + signed);
  }
  return map;
}

export const accountsRouter = Router();

accountsRouter.get("/", async (req, res) => {
  const [accounts, balances] = await Promise.all([
    prisma.account.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "asc" } }),
    balancesByAccount(req.userId),
  ]);
  res.json(accounts.map((a) => ({ ...a, balance: a.initialBalance + (balances.get(a.id) ?? 0) })));
});

accountsRouter.post("/", async (req, res) => {
  const data = accountSchema.parse(req.body);
  res.status(201).json(await prisma.account.create({ data: { ...data, userId: req.userId } }));
});

accountsRouter.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = accountSchema.partial().parse(req.body);
  await findAccount(req.userId, id);
  res.json(await prisma.account.update({ where: { id }, data }));
});

accountsRouter.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await findAccount(req.userId, id);
  if (await prisma.transaction.count({ where: { accountId: id } })) {
    throw new HttpError(409, "Conta possui transações");
  }
  await prisma.account.delete({ where: { id } });
  res.status(204).end();
});
