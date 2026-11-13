import { describe, expect, it } from "vitest";
import { loggedAgent } from "./helpers.js";

type Agent = Awaited<ReturnType<typeof loggedAgent>>["agent"];

async function setup(agent: Agent) {
  const acc = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING", initialBalance: 100000 })).body;
  const acc2 = (await agent.post("/api/accounts").send({ name: "P", type: "SAVINGS", initialBalance: 50000 })).body;
  const cats = (await agent.get("/api/categories")).body as { id: string; name: string; kind: string }[];
  const find = (name: string) => cats.find((c) => c.name === name)!;
  const add = (o: { categoryId: string; kind: string; amount: number; date: string; accountId?: string }) =>
    agent.post("/api/transactions").send({ accountId: acc.id, description: "t", ...o }).expect(201);
  return { acc, acc2, food: find("Alimentação"), fun: find("Lazer"), salary: find("Salário"), add };
}

describe("budgets", () => {
  it("upserts per category+month and computes spent for that month only", async () => {
    const { agent } = await loggedAgent();
    const { food, add } = await setup(agent);
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 3000, date: "2026-03-01" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 2000, date: "2026-03-31" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 9999, date: "2026-04-01" });

    const first = await agent.put("/api/budgets").send({ categoryId: food.id, month: "2026-03", limit: 10000 });
    expect(first.status).toBe(200);
    const again = await agent.put("/api/budgets").send({ categoryId: food.id, month: "2026-03", limit: 4000 });
    expect(again.body.id).toBe(first.body.id);

    const list = (await agent.get("/api/budgets?month=2026-03")).body;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ limit: 4000, spent: 5000, category: { name: "Alimentação" } });
    expect((await agent.get("/api/budgets?month=2026-04")).body).toHaveLength(0);
  });

  it("rejects budgets on income categories and bad months", async () => {
    const { agent } = await loggedAgent();
    const { salary, food } = await setup(agent);
    expect((await agent.put("/api/budgets").send({ categoryId: salary.id, month: "2026-03", limit: 100 })).status).toBe(400);
    expect((await agent.put("/api/budgets").send({ categoryId: food.id, month: "2026-13", limit: 100 })).status).toBe(400);
    expect((await agent.put("/api/budgets").send({ categoryId: food.id, month: "2026-03", limit: 0 })).status).toBe(400);
  });

  it("isolates users and deletes", async () => {
    const a = await loggedAgent();
    const b = await loggedAgent("Bia");
    const sa = await setup(a.agent);
    const budget = (await a.agent.put("/api/budgets").send({ categoryId: sa.food.id, month: "2026-03", limit: 100 })).body;
    expect((await b.agent.put("/api/budgets").send({ categoryId: sa.food.id, month: "2026-03", limit: 1 })).status).toBe(404);
    expect((await b.agent.delete(`/api/budgets/${budget.id}`)).status).toBe(404);
    expect((await a.agent.delete(`/api/budgets/${budget.id}`)).status).toBe(204);
  });
});

describe("dashboard", () => {
  it("summarizes the month, categories, 12-month history and balance", async () => {
    const { agent } = await loggedAgent();
    const { acc2, food, fun, salary, add } = await setup(agent);
    await add({ categoryId: salary.id, kind: "INCOME", amount: 500000, date: "2026-03-05" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 30000, date: "2026-03-10" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 20000, date: "2026-03-31", accountId: acc2.id });
    await add({ categoryId: fun.id, kind: "EXPENSE", amount: 10000, date: "2026-03-15" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 7777, date: "2026-02-28" });
    await add({ categoryId: food.id, kind: "EXPENSE", amount: 1111, date: "2025-03-31" }); // 13 months back: excluded from history

    const d = (await agent.get("/api/dashboard?month=2026-03")).body;
    expect(d.monthIncome).toBe(500000);
    expect(d.monthExpense).toBe(60000);
    expect(d.totalBalance).toBe(150000 + 500000 - 60000 - 7777 - 1111);
    expect(d.byCategory).toEqual([
      { categoryId: food.id, name: "Alimentação", color: expect.any(String), total: 50000 },
      { categoryId: fun.id, name: "Lazer", color: expect.any(String), total: 10000 },
    ]);
    expect(d.last12Months).toHaveLength(12);
    expect(d.last12Months[0]).toEqual({ month: "2025-04", income: 0, expense: 0 });
    expect(d.last12Months[10]).toEqual({ month: "2026-02", income: 0, expense: 7777 });
    expect(d.last12Months[11]).toEqual({ month: "2026-03", income: 500000, expense: 60000 });
    expect(d.recent).toHaveLength(5);
    expect(d.recent[0].date).toBe("2026-03-31");
  });

  it("rejects an invalid month", async () => {
    const { agent } = await loggedAgent();
    expect((await agent.get("/api/dashboard?month=março")).status).toBe(400);
  });
});
