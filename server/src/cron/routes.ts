import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";

const GUEST_TTL_MS = 24 * 3600 * 1000;

function authorized(header: string | undefined) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export const cronRouter = Router();

// Called daily by Vercel Cron (vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
cronRouter.get("/cleanup", async (req, res) => {
  if (!authorized(req.headers.authorization)) throw new HttpError(401, "Não autorizado");
  const { count } = await prisma.user.deleteMany({
    where: { isGuest: true, createdAt: { lt: new Date(Date.now() - GUEST_TTL_MS) } },
  });
  res.json({ deleted: count });
});
