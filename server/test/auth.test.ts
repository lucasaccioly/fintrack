import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app, loggedAgent } from "./helpers.js";

const creds = { name: "Ana", email: "ana@test.dev", password: "secret123" };

describe("auth", () => {
  it("registers, sets an httpOnly cookie and never returns the hash", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Ana", email: "ana@test.dev", isGuest: false });
    expect(res.body.passwordHash).toBeUndefined();
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("creates default categories for a new user", async () => {
    const { user } = await loggedAgent();
    const cats = await prisma.category.findMany({ where: { userId: user.id } });
    expect(cats.filter((c) => c.kind === "EXPENSE").map((c) => c.name)).toContain("Alimentação");
    expect(cats.filter((c) => c.kind === "INCOME").map((c) => c.name)).toContain("Salário");
  });

  it("rejects duplicate email with 409 (case-insensitive)", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const res = await request(app).post("/api/auth/register").send({ ...creds, email: "ANA@test.dev" });
    expect(res.status).toBe(409);
  });

  it("validates input", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...creds, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeTruthy();
  });

  it("logs in with right password, 401 with wrong one", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const ok = await request(app).post("/api/auth/login").send({ email: creds.email, password: creds.password });
    expect(ok.status).toBe(200);
    expect(String(ok.headers["set-cookie"])).toMatch(/token=/);
    const bad = await request(app).post("/api/auth/login").send({ email: creds.email, password: "wrongpass" });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post("/api/auth/login").send({ email: "x@test.dev", password: "whatever1" });
    expect(unknown.status).toBe(401);
  });

  it("/auth/me requires the cookie", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const { agent } = await loggedAgent();
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("Ana");
  });

  it("rejects a tampered token", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "token=abc.def.ghi");
    expect(res.status).toBe(401);
  });

  it("logout clears the cookie", async () => {
    const { agent } = await loggedAgent();
    const out = await agent.post("/api/auth/logout");
    expect(out.status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("guest login creates a seeded guest user", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/guest");
    expect(res.status).toBe(201);
    expect(res.body.isGuest).toBe(true);
    const userId = res.body.id;
    expect(await prisma.account.count({ where: { userId } })).toBeGreaterThanOrEqual(3);
    const txs = await prisma.transaction.findMany({ where: { userId }, select: { date: true } });
    const months = new Set(txs.map((t) => t.date.toISOString().slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(6);
    expect(await prisma.budget.count({ where: { userId } })).toBeGreaterThan(0);
    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });
});
