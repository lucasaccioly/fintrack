import { config } from "dotenv";
import { beforeEach } from "vitest";

config({ quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
process.env.JWT_SECRET ??= "test-secret";
process.env.CRON_SECRET ??= "test-cron";

const { prisma } = await import("../src/db.js");

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Transaction", "Budget", "Category", "Account", "User" CASCADE',
  );
}

beforeEach(resetDb);
