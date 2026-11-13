/** Picks the separator that appears most in the header line (outside quotes). */
function detectSeparator(firstLine: string) {
  const unquoted = firstLine.replace(/"[^"]*"/g, "");
  const counts = [";", ",", "\t"].map((sep) => [sep, unquoted.split(sep).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ",";
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF, BOM, blank lines skipped. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const src = text.replace(/^﻿/, "");
  if (!src.trim()) return { headers: [], rows: [] };
  const sep = detectSeparator(src.split(/\r?\n/, 1)[0]);

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += c;
  }
  record.push(field);
  records.push(record);

  const nonBlank = records.filter((r) => r.some((f) => f.trim() !== ""));
  const [headers = [], ...rows] = nonBlank.map((r) => r.map((f) => f.trim()));
  return { headers, rows };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Guesses which column holds date / description / amount from header names (-1 = not found). */
export function guessColumns(headers: string[]) {
  const h = headers.map(norm);
  const used = new Set<number>();
  const find = (re: RegExp, not?: RegExp) => {
    const i = h.findIndex((x, idx) => !used.has(idx) && re.test(x) && !(not && not.test(x)));
    if (i >= 0) used.add(i);
    return i;
  };
  const date = find(/data|date/);
  const amount = find(/valor|amount|quantia|value|montante/, /saldo|balance/);
  const description = find(/descri|hist|memo|estabelec|titulo|title|lancamento|detalhe/);
  return { date, description, amount };
}
