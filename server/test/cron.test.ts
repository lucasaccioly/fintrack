import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app } from "./helpers.js";

const old = new Date(Date.now() - 25 * 3600 * 1000);
const mk = (email: string, isGuest: boolean, createdAt: Date) =>
  prisma.user.create({ data: { name: "x", email, passwordHash: "x", isGuest, createdAt } });

describe("GET /api/cron/cleanup", () => {
  it("requires the cron secret", async () => {
    expect((await request(app).get("/api/cron/cleanup")).status).toBe(401);
    const wrong = await request(app).get("/api/cron/cleanup").set("Authorization", "Bearer nope");
    expect(wrong.status).toBe(401);
  });

  it("deletes only guests older than 24h", async () => {
    await mk("old-guest@x", true, old);
    await mk("new-guest@x", true, new Date());
    await mk("old-real@x", false, old);
    const res = await request(app)
      .get("/api/cron/cleanup")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 1 });
    const left = (await prisma.user.findMany()).map((u) => u.email).sort();
    expect(left).toEqual(["new-guest@x", "old-real@x"]);
  });
});
