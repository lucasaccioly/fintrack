import { describe, expect, it } from "vitest";
import { loggedAgent } from "./helpers.js";

type Agent = Awaited<ReturnType<typeof loggedAgent>>["agent"];

async function setup(agent: Agent) {
  const account = (await agent.post("/api/accounts").send({ name: "C", type: "CHECKING" })).body;
  const cats = (await agent.get("/api/categories")).body as { id: string; name: string; kind: string }[];
  const food = cats.find((c) => c.name === "Alimentação")!;
  const salary = cats.find((c) => c.name === "Salário")!;
  const otherExpense = cats.find((c) => c.name === "Outros" && c.kind === "EXPENSE")!;
  const otherIncome = cats.find((c) => c.name === "Outros" && c.kind === "INCOME")!;
  return { account, food, salary, otherExpense, otherIncome };
}

const tx = (accountId: string, categoryId: string, over: Record<string, unknown> = {}) => ({
  accountId,
  categoryId,
  kind: "EXPENSE",
  amount: 1000,
  date: "2026-01-15",
  description: "Mercado",
  ...over,
});

describe("transactions", () => {
  it("CRUD round-trips the date exactly", async () => {
    const { agent } = await loggedAgent();
    const { account, food } = await setup(agent);
    const c = await agent.post("/api/transactions").send(tx(account.id, food.id, { date: "2026-01-31" }));
    expect(c.status).toBe(201);
    expect(c.body.date).toBe("2026-01-31");
    expect(c.body.category).toMatchObject({ name: "Alimentação" });

    const p = await agent.patch(`/api/transactions/${c.body.id}`).send({ amount: 2500, description: "Feira" });
    expect(p.body).toMatchObject({ amount: 2500, description: "Feira", date: "2026-01-31" });

    expect((await agent.delete(`/api/transactions/${c.body.id}`)).status).toBe(204);
    expect((await agent.get("/api/transactions")).body.total).toBe(0);
  });

  it("validates amount, date and kind/category match", async () => {
    const { agent } = await loggedAgent();
    const { account, food, salary } = await setup(agent);
    expect((await agent.post("/api/transactions").send(tx(account.id, food.id, { amount: 0 }))).status).toBe(400);
    expect((await agent.post("/api/transactions").send(tx(account.id, food.id, { amount: 10.5 }))).status).toBe(400);
    expect((await agent.post("/api/transactions").send(tx(account.id, food.id, { date: "2026-02-30" }))).status).toBe(400);
    expect((await agent.post("/api/transactions").send(tx(account.id, salary.id))).status).toBe(400);
  });

  it("another user's account/category/transaction is a 404", async () => {
    const a = await loggedAgent();
    const b = await loggedAgent("Bia");
    const sa = await setup(a.agent);
    const sb = await setup(b.agent);
    expect((await b.agent.post("/api/transactions").send(tx(sa.account.id, sb.food.id))).status).toBe(404);
    expect((await b.agent.post("/api/transactions").send(tx(sb.account.id, sa.food.id))).status).toBe(404);
    const t = (await a.agent.post("/api/transactions").send(tx(sa.account.id, sa.food.id))).body;
    expect((await b.agent.patch(`/api/transactions/${t.id}`).send({ amount: 1 })).status).toBe(404);
    expect((await b.agent.delete(`/api/transactions/${t.id}`)).status).toBe(404);
    expect((await b.agent.get("/api/transactions")).body.total).toBe(0);
  });

  it("filters, paginates and sorts", async () => {
    const { agent } = await loggedAgent();
    const { account, food, salary } = await setup(agent);
    const add = (o: Record<string, unknown>) => agent.post("/api/transactions").send(tx(account.id, food.id, o));
    await add({ date: "2026-01-01", amount: 100, description: "Padaria do Zé" });
    await add({ date: "2026-01-31", amount: 300, description: "Supermercado" });
    await add({ date: "2026-02-01", amount: 200, description: "padaria nova" });
    await agent.post("/api/transactions").send(tx(account.id, salary.id, { kind: "INCOME", amount: 9999 }));

    const jan = await agent.get("/api/transactions?from=2026-01-01&to=2026-01-31&kind=EXPENSE");
    expect(jan.body.total).toBe(2);

    const q = await agent.get("/api/transactions?q=PADARIA");
    expect(q.body.items.map((t: { description: string }) => t.description).sort()).toEqual(["Padaria do Zé", "padaria nova"]);

    const page = await agent.get("/api/transactions?kind=EXPENSE&sort=amount&order=asc&page=2&pageSize=2");
    expect(page.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page.body.items.map((t: { amount: number }) => t.amount)).toEqual([300]);

    expect((await agent.get("/api/transactions?pageSize=500")).status).toBe(400);
  });

  it("import creates transactions with kind from the sign and default category", async () => {
    const { agent } = await loggedAgent();
    const { account, food, otherExpense, otherIncome } = await setup(agent);
    const res = await agent.post("/api/transactions/import").send({
      accountId: account.id,
      rows: [
        { date: "2026-03-01", description: "Pix recebido", amount: 5000 },
        { date: "2026-03-02", description: "Compra", amount: -1234 },
        { date: "2026-03-03", description: "Mercado", amount: -800, categoryId: food.id },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 3 });
    const items = (await agent.get("/api/transactions?sort=date&order=asc")).body.items;
    expect(items.map((t: { kind: string; amount: number; categoryId: string }) => [t.kind, t.amount, t.categoryId])).toEqual([
      ["INCOME", 5000, otherIncome.id],
      ["EXPENSE", 1234, otherExpense.id],
      ["EXPENSE", 800, food.id],
    ]);
  });

  it("import rejects too many rows, zero amounts and foreign accounts", async () => {
    const { agent } = await loggedAgent();
    const other = await loggedAgent("Bia");
    const { account } = await setup(agent);
    const foreign = await setup(other.agent);
    const row = { date: "2026-03-01", description: "x", amount: -1 };
    expect((await agent.post("/api/transactions/import").send({ accountId: account.id, rows: Array(2001).fill(row) })).status).toBe(400);
    expect((await agent.post("/api/transactions/import").send({ accountId: account.id, rows: [{ ...row, amount: 0 }] })).status).toBe(400);
    expect((await agent.post("/api/transactions/import").send({ accountId: foreign.account.id, rows: [row] })).status).toBe(404);
  });
});
