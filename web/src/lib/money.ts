const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Cents -> "R$ 1.234,56". Money is integer cents everywhere; format only at render. */
export const formatBRL = (cents: number) => brl.format(cents / 100);

/**
 * Parses money as exported by Brazilian banks into integer cents.
 * Accepts "1.234,56", "-50,00", "(50,00)", "R$ 10", and dot-decimal "12.50" / "1,234.56".
 * Returns null when the text is not a number.
 */
export function parseBRL(input: string): number | null {
  let s = input.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let fracPart = "";
  if (lastComma >= 0 && lastDot >= 0) {
    // both present: the last one is the decimal separator
    const dec = lastComma > lastDot ? "," : ".";
    const [i, f] = s.split(dec);
    if (s.split(dec).length !== 2) return null;
    intPart = i.replaceAll(dec === "," ? "." : ",", "");
    fracPart = f;
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length !== 2) return null;
    [intPart, fracPart] = parts;
    intPart = intPart.replaceAll(".", "");
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    const tail = parts[parts.length - 1];
    if (parts.length === 2 && tail.length <= 2) {
      [intPart, fracPart] = parts; // "12.50"
    } else {
      if (parts.slice(1).some((p) => p.length !== 3)) return null;
      intPart = parts.join(""); // "1.234.567"
    }
  } else {
    intPart = s;
  }
  if (!/^\d*$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null;
  const value = Number(intPart || "0") * 100 + Number(fracPart.padEnd(2, "0") || "0");
  return negative ? -value : value;
}

/** "31/01/2026", "1/2/26" or "2026-01-31" -> "2026-01-31"; null when not a real date. */
export function parseBrDate(input: string): string | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    d = Number(match[1]);
    m = Number(match[2]);
    y = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  } else if ((match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}
