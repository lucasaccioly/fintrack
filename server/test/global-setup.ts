import { config } from "dotenv";
import { execSync } from "node:child_process";

// Bring the test database schema up to date before any test file runs.
export default function () {
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
