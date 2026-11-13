import { parseBRL, parseBrDate } from "./money";

export type Mapping = { date: number; description: number; amount: number };
export type PreviewRow =
  | { ok: true; line: number; date: string; description: string; amount: number }
  | { ok: false; line: number; raw: string[]; error: string };

/** Turns raw CSV rows into validated import rows; invalid ones are flagged, never thrown. */
export function toPreview(rows: string[][], map: Mapping): PreviewRow[] {
  return rows.map((raw, i) => {
    const line = i + 2; // +1 header, +1 human 1-based
    const date = parseBrDate(raw[map.date] ?? "");
    const amount = parseBRL(raw[map.amount] ?? "");
    const description = (raw[map.description] ?? "").trim().slice(0, 120);
    if (!date) return { ok: false, line, raw, error: "Data inválida" };
    if (amount === null) return { ok: false, line, raw, error: "Valor inválido" };
    if (amount === 0) return { ok: false, line, raw, error: "Valor zero" };
    if (!description) return { ok: false, line, raw, error: "Sem descrição" };
    return { ok: true, line, date, description, amount };
  });
}
