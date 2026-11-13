import express from "express";
import cookieParser from "cookie-parser";
import { requireAuth } from "./auth/middleware.js";
import { authRouter } from "./auth/routes.js";
import { cronRouter } from "./cron/routes.js";
import { errorHandler } from "./errors.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  api.use("/auth", authRouter);
  api.use("/cron", cronRouter);

  // Routers below require a logged-in user.
  const routes: [string, express.Router][] = [];
  for (const [path, router] of routes) api.use(path, requireAuth, router);

  app.use("/api", api);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Rota não encontrada" });
  });
  app.use(errorHandler);
  return app;
}
