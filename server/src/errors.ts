import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Não encontrado");

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: "Dados inválidos", details: err.issues });
  } else if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
};
