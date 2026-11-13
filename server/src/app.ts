import express from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "./errors.js";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.get("/health", (_req, res) => { res.json({ ok: true }); });

  app.use("/api", api);
  app.use("/api", (_req, res) => { res.status(404).json({ error: "Rota não encontrada" }); });
  app.use(errorHandler);
  return app;
}
