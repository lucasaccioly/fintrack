import { Router } from "express";
import { z } from "zod";
import { findAccount } from "../accounts/routes.js";
import { findCategory } from "../categories/routes.js";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError, notFound } from "../errors.js";
import { fromDbDate, toDbDate } from "../lib/dates.js";
import { cents, idParam, kind, positiveCents, ymd } from "../lib/validation.js";

const include = {
  category: { select: { id: true, name: true, color: true } },
  account: { select: { id: true, name: true } },
} as const;

type TxWithRelations = Prisma.TransactionGetPayload<{ include: typeof include }>;
export const serialize = ({ userId: _u, createdAt: _c, ...t }: TxWithRelations) => ({ ...t, date: fromDbDate(t.date) });

const txSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  kind,
  amount: positiveCents,
  date: ymd,
  description: z.string().trim().min(1, "Informe a descrição").max(120),
});

export const listQuery = z.object({
  from: ymd.optional(),
  to: ymd.optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  kind: kind.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["date", "amount"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export function buildWhere(userId: string, f: z.infer<typeof listQuery>): Prisma.TransactionWhereInput {
  return {
    userId,
    accountId: f.accountId,
    categoryId: f.categoryId,
    kind: f.kind,
    date: f.from || f.to ? { gte: f.from && toDbDate(f.from), lte: f.to && toDbDate(f.to) } : undefined,
    description: f.q ? { contains: f.q, mode: "insensitive" } : undefined,
  };
}

/** Ownership + kind checks shared by create and update. */
async function assertRefs(userId: string, accountId: string, categoryId: string, txKind: "INCOME" | "EXPENSE") {
  await findAccount(userId, accountId);
  const category = await findCategory(userId, categoryId);
  if (category.kind !== txKind) throw new HttpError(400, "A categoria não é do mesmo tipo da transação");
}

const importSchema = z.object({
  accountId: z.string().min(1),
  rows: z
    .array(
      z.object({
        date: ymd,
        description: z.string().trim().min(1).max(120),
        amount: cents.refine((v) => v !== 0, "Valor não pode ser zero"),
        categoryId: z.string().optional(),
      }),
    )
    .min(1)
    .max(2000, "Máximo de 2000 linhas por importação"),
});

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req, res) => {
  const f = listQuery.parse(req.query);
  const where = buildWhere(req.userId, f);
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include,
      orderBy: [{ [f.sort]: f.order }, { createdAt: f.order }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ items: items.map(serialize), total, page: f.page, pageSize: f.pageSize });
});

transactionsRouter.post("/", async (req, res) => {
  const data = txSchema.parse(req.body);
  await assertRefs(req.userId, data.accountId, data.categoryId, data.kind);
  const created = await prisma.transaction.create({
    data: { ...data, date: toDbDate(data.date), userId: req.userId },
    include,
  });
  res.status(201).json(serialize(created));
});

transactionsRouter.post("/import", async (req, res) => {
  const { accountId, rows } = importSchema.parse(req.body);
  await findAccount(req.userId, accountId);
  const categories = await prisma.category.findMany({ where: { userId: req.userId } });
  const byId = new Map(categories.map((c) => [c.id, c]));
  const fallback = (k: "INCOME" | "EXPENSE") =>
    categories.find((c) => c.kind === k && c.name === "Outros") ?? categories.find((c) => c.kind === k);

  const data = rows.map((r, i) => {
    const k = r.amount > 0 ? "INCOME" : "EXPENSE";
    const category = r.categoryId ? byId.get(r.categoryId) : fallback(k);
    if (!category) throw r.categoryId ? notFound() : new HttpError(400, `Crie uma categoria de ${k === "INCOME" ? "receita" : "despesa"} antes de importar`);
    if (category.kind !== k) throw new HttpError(400, `Linha ${i + 1}: categoria não é do mesmo tipo do valor`);
    return {
      userId: req.userId,
      accountId,
      categoryId: category.id,
      kind: k,
      amount: Math.abs(r.amount),
      date: toDbDate(r.date),
      description: r.description,
    } as const;
  });
  const { count } = await prisma.transaction.createMany({ data });
  res.json({ imported: count });
});

transactionsRouter.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = txSchema.partial().parse(req.body);
  const current = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
  if (!current) throw notFound();
  await assertRefs(
    req.userId,
    data.accountId ?? current.accountId,
    data.categoryId ?? current.categoryId,
    data.kind ?? current.kind,
  );
  const updated = await prisma.transaction.update({
    where: { id },
    data: { ...data, date: data.date ? toDbDate(data.date) : undefined },
    include,
  });
  res.json(serialize(updated));
});

transactionsRouter.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId: req.userId } });
  if (!count) throw notFound();
  res.status(204).end();
});
