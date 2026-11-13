import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // not env(): `prisma generate` must work without a DB (CI install, Vercel build step order)
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
