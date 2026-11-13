import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // CLI only (migrations). Prefer Neon's direct URL: migrations should not go through the pooler.
  // Not env(): `prisma generate` must also work with no DB configured (CI install, postinstall).
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
