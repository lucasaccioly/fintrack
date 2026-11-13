import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { toDbDate } from "../src/lib/dates.js";
import { loggedAgent } from "./helpers.js";

async function addTx(userId: string, accountId: string, kind: "INCOME" | "EXPENSE", amount: number) {
  const cat = await prisma.category.findFirstOrThrow({ where: { userId, kind } });
  return prisma.transaction.create({
    data: { userId, accountId, categoryId: cat.id, kind, amount, date: toDbDate("2026-01-10"), description: "t" },
  });
}

describe("accounts", () => {
  it("CRUD happy path", async () => {
    const { agent } = await loggedAgent();
    const created = await agent.post("/api/accounts").send({ name: "Nubank", type: "CHECKING", initialBalance: 10000 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Nubank", type: "CHECKING", initialBalance: 10000 });

    const patched = await agent.patch(`/api/accounts/${created.body.id}`).send({ name: "Nubank PF" });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe("Nubank PF");

    const list = await agent.get("/api/accounts");
    expect(list.body).toHaveLength(1);

    expect((await agent.delete(`/api/accounts/${created.body.id}`)).status).toBe(204);
    expect((await agent.get("/api/accounts")).body).toHaveLength(0);
  });

  it("balance = initial + incomes - expenses", async () => {
    const { agent, user } = await loggedAgent();
    const acc = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING", initialBalance: 10000 })).body;
    await addTx(user.id, acc.id, "INCOME", 5000);
    await addTx(user.id, acc.id, "EXPENSE", 2500);
    const [row] = (await agent.get("/api/accounts")).body;
    expect(row.balance).toBe(12500);
  });

  it("rejects invalid input", async () => {
    const { agent } = await loggedAgent();
    expect((await agent.post("/api/accounts").send({ name: "", type: "CHECKING" })).status).toBe(400);
    expect((await agent.post("/api/accounts").send({ name: "X", type: "BITCOIN" })).status).toBe(400);
    expect((await agent.post("/api/accounts").send({ name: "X", type: "CASH", initialBalance: 1.5 })).status).toBe(400);
  });

  it("another user's account is a 404", async () => {
    const a = await loggedAgent();
    const b = await loggedAgent("Bia");
    const acc = (await a.agent.post("/api/accounts").send({ name: "A", type: "CASH" })).body;
    expect((await b.agent.patch(`/api/accounts/${acc.id}`).send({ name: "hack" })).status).toBe(404);
    expect((await b.agent.delete(`/api/accounts/${acc.id}`)).status).toBe(404);
    expect((await b.agent.get("/api/accounts")).body).toHaveLength(0);
  });

  it("cannot delete an account that has transactions", async () => {
    const { agent, user } = await loggedAgent();
    const acc = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING" })).body;
    await addTx(user.id, acc.id, "EXPENSE", 100);
    const res = await agent.delete(`/api/accounts/${acc.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Conta possui transações");
  });

  it("requires auth", async () => {
    const { default: request } = await import("supertest");
    const { app } = await import("./helpers.js");
    expect((await request(app).get("/api/accounts")).status).toBe(401);
  });
});

describe("categories", () => {
  it("lists defaults and supports CRUD", async () => {
    const { agent } = await loggedAgent();
    const before = (await agent.get("/api/categories")).body.length;
    expect(before).toBe(12);
    const c = await agent.post("/api/categories").send({ name: "Pets", color: "#a855f7", kind: "EXPENSE" });
    expect(c.status).toBe(201);
    const p = await agent.patch(`/api/categories/${c.body.id}`).send({ color: "#000000" });
    expect(p.body.color).toBe("#000000");
    expect((await agent.delete(`/api/categories/${c.body.id}`)).status).toBe(204);
  });

  it("rejects invalid color", async () => {
    const { agent } = await loggedAgent();
    const res = await agent.post("/api/categories").send({ name: "X", color: "red", kind: "EXPENSE" });
    expect(res.status).toBe(400);
  });

  it("another user's category is a 404", async () => {
    const a = await loggedAgent();
    const b = await loggedAgent("Bia");
    const [cat] = (await a.agent.get("/api/categories")).body;
    expect((await b.agent.patch(`/api/categories/${cat.id}`).send({ name: "x" })).status).toBe(404);
    expect((await b.agent.delete(`/api/categories/${cat.id}`)).status).toBe(404);
  });

  it("cannot delete a category that has transactions", async () => {
    const { agent, user } = await loggedAgent();
    const acc = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING" })).body;
    const tx = await addTx(user.id, acc.id, "EXPENSE", 100);
    const res = await agent.delete(`/api/categories/${tx.categoryId}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Categoria possui transações");
  });

  it("cannot change the kind of a category that has transactions", async () => {
    const { agent, user } = await loggedAgent();
    const acc = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING" })).body;
    const tx = await addTx(user.id, acc.id, "EXPENSE", 100);
    const res = await agent.patch(`/api/categories/${tx.categoryId}`).send({ kind: "INCOME" });
    expect(res.status).toBe(409);
  });
});
