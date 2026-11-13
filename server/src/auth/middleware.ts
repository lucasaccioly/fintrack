import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../errors.js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const COOKIE = "token";
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, secret(), { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, "Não autenticado");
  try {
    req.userId = (jwt.verify(token, secret()) as { sub: string }).sub;
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada");
  }
  next();
};
