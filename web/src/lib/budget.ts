/** Alert thresholds from the spec: amber from 80%, red from 100%. */
export function budgetStatus(spent: number, limit: number) {
  const pct = limit > 0 ? spent / limit : 0;
  if (pct >= 1) return { pct, level: "over", bar: "bg-rose-500", text: "text-rose-600", label: "Estourado" } as const;
  if (pct >= 0.8) return { pct, level: "warn", bar: "bg-amber-500", text: "text-amber-600", label: "Atenção" } as const;
  return { pct, level: "ok", bar: "bg-emerald-500", text: "text-emerald-600", label: "No limite" } as const;
}
