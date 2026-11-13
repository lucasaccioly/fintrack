import { z } from "zod";

/** Money in integer cents. */
export const cents = z.number().int("Valor em centavos deve ser inteiro").min(-1e12).max(1e12);
export const positiveCents = cents.positive("Valor deve ser maior que zero");
export const kind = z.enum(["INCOME", "EXPENSE"]);
export const ymd = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Data inválida (AAAA-MM-DD)").refine(
  (s) => new Date(`${s}T00:00:00Z`).toISOString().startsWith(s),
  "Data inválida",
);
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido (AAAA-MM)");
export const idParam = z.object({ id: z.string().min(1) });
