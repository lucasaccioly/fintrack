import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError, notFound } from "../errors.js";
import { idParam, kind } from "../lib/validation.js";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (#rrggbb)"),
  kind,
});

export async function findCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw notFound();
  return category;
}

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res) => {
  res.json(
    await prisma.category.findMany({ where: { userId: req.userId }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
  );
});

categoriesRouter.post("/", async (req, res) => {
  const data = categorySchema.parse(req.body);
  res.status(201).json(await prisma.category.create({ data: { ...data, userId: req.userId } }));
});

categoriesRouter.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = categorySchema.partial().parse(req.body);
  const current = await findCategory(req.userId, id);
  if (data.kind && data.kind !== current.kind && (await prisma.transaction.count({ where: { categoryId: id } }))) {
    throw new HttpError(409, "Categoria possui transações; o tipo não pode mudar");
  }
  res.json(await prisma.category.update({ where: { id }, data }));
});

categoriesRouter.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await findCategory(req.userId, id);
  if (await prisma.transaction.count({ where: { categoryId: id } })) {
    throw new HttpError(409, "Categoria possui transações");
  }
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
});
