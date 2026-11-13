import { describe, expect, it } from "vitest";
import { budgetStatus } from "./budget";
import { addMonths, monthBounds } from "./dates";
import { toPreview } from "./importRows";

describe("budgetStatus", () => {
  it.each([
    [0, 1000, "ok"],
    [799, 1000, "ok"],
    [800, 1000, "warn"],
    [999, 1000, "warn"],
    [1000, 1000, "over"],
    [1500, 1000, "over"],
  ])("spent %i of %i -> %s", (spent, limit, level) => {
    expect(budgetStatus(spent, limit).level).toBe(level);
  });
});

describe("dates", () => {
  it("monthBounds handles month length and leap years", () => {
    expect(monthBounds("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(monthBounds("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("addMonths crosses years", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
});

describe("bundled example CSV", () => {
  it("parses fully with auto-guessed columns", async () => {
    const { readFileSync } = await import("node:fs");
    const { parseCsv, guessColumns } = await import("./csv");
    const csv = parseCsv(readFileSync(new URL("../../public/exemplo-extrato.csv", import.meta.url), "utf8"));
    const rows = toPreview(csv.rows, guessColumns(csv.headers));
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.ok)).toBe(true);
    expect(rows[5]).toMatchObject({ description: "Restaurante Sabor; Centro", amount: -8900 });
  });
});

describe("toPreview", () => {
  const map = { date: 0, description: 1, amount: 2 };
  it("keeps valid rows and flags invalid ones with their line number", () => {
    const rows = [
      ["01/03/2026", "Padaria", "-12,50"],
      ["31/02/2026", "Data ruim", "-1,00"],
      ["02/03/2026", "Valor ruim", "abc"],
      ["03/03/2026", "Zero", "0,00"],
      ["04/03/2026", "", "10,00"],
      ["05/03/2026"], // short row
    ];
    const out = toPreview(rows, map);
    expect(out[0]).toEqual({ ok: true, line: 2, date: "2026-03-01", description: "Padaria", amount: -1250 });
    expect(out.slice(1).map((r) => (r.ok ? "ok" : r.error))).toEqual([
      "Data inválida",
      "Valor inválido",
      "Valor zero",
      "Sem descrição",
      "Valor inválido",
    ]);
  });
});
