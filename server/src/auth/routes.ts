import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { createUserWithDefaults } from "../seed/defaults.js";
import { seedGuestData } from "../seed/guestData.js";
import { clearAuthCookie, requireAuth, setAuthCookie } from "./middleware.js";

const publicUser = (u: { id: string; name: string; email: string; isGuest: boolean }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  isGuest: u.isGuest,
});

const email = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"));
const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email,
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(100),
});
const loginSchema = z.object({ email, password: z.string().min(1) });

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, "E-mail já cadastrado");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.$transaction((tx) =>
    createUserWithDefaults(tx, { name: data.name, email: data.email, passwordHash }),
  );
  setAuthCookie(res, user.id);
  res.status(201).json(publicUser(user));
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isGuest || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "E-mail ou senha incorretos");
  }
  setAuthCookie(res, user.id);
  res.json(publicUser(user));
});

authRouter.post("/guest", async (_req, res) => {
  const user = await prisma.$transaction(
    async (tx) => {
      const u = await createUserWithDefaults(tx, {
        name: "Visitante",
        email: `guest-${randomUUID()}@fintrack.demo`,
        passwordHash: "-", // not a bcrypt hash: guests can never log in by password
        isGuest: true,
      });
      await seedGuestData(tx, u.id);
      return u;
    },
    { timeout: 20000 },
  );
  setAuthCookie(res, user.id);
  res.status(201).json(publicUser(user));
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, "Sessão inválida ou expirada");
  res.json(publicUser(user));
});
