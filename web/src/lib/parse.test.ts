import { describe, expect, it } from "vitest";
import { parseCsv, guessColumns } from "./csv";
import { formatBRL, parseBRL, parseBrDate } from "./money";

describe("parseBRL", () => {
  it.each([
    ["1.234,56", 123456],
    ["-50,00", -5000],
    ["(50,00)", -5000],
    ["R$ 10", 1000],
    ["R$ -1.000,5", -100050],
    ["12.50", 1250], // dot decimal (some banks export this)
    ["1,234.56", 123456],
    ["  7  ", 700],
    ["abc", null],
    ["", null],
    ["1,2,3", null],
  ])("%s -> %s", (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });
});

describe("parseBrDate", () => {
  it.each([
    ["31/01/2026", "2026-01-31"],
    ["1/2/2026", "2026-02-01"],
    ["2026-01-31", "2026-01-31"],
    ["31/01/26", "2026-01-31"],
    ["32/01/2026", null],
    ["29/02/2026", null],
    ["29/02/2024", "2024-02-29"],
    ["hoje", null],
  ])("%s -> %s", (input, expected) => {
    expect(parseBrDate(input)).toBe(expected);
  });
});

describe("formatBRL", () => {
  it("formats cents as reais", () => {
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatBRL(-5000).replace(/\s/g, " ")).toBe("-R$ 50,00");
  });
});

describe("parseCsv", () => {
  it("strips BOM, detects ';' and skips blank lines", () => {
    const text = "﻿Data;Descrição;Valor\r\n01/03/2026;Padaria;-12,50\r\n\r\n02/03/2026;Salário;5.000,00\r\n\r\n";
    expect(parseCsv(text)).toEqual({
      headers: ["Data", "Descrição", "Valor"],
      rows: [
        ["01/03/2026", "Padaria", "-12,50"],
        ["02/03/2026", "Salário", "5.000,00"],
      ],
    });
  });

  it("handles ',' with quoted fields containing separators and quotes", () => {
    const text = 'date,description,amount\n2026-03-01,"Loja ""A"", Centro",-10.00\n';
    expect(parseCsv(text).rows).toEqual([["2026-03-01", 'Loja "A", Centro', "-10.00"]]);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});

describe("guessColumns", () => {
  it("maps common Brazilian bank headers", () => {
    expect(guessColumns(["Data Lançamento", "Histórico", "Valor (R$)", "Saldo"])).toEqual({
      date: 0,
      description: 1,
      amount: 2,
    });
    expect(guessColumns(["foo", "bar"])).toEqual({ date: -1, description: -1, amount: -1 });
  });
});
