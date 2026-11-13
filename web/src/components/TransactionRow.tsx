import type { ReactNode } from "react";
import type { Transaction } from "../api/types";
import { formatDate } from "../lib/dates";
import { formatBRL } from "../lib/money";
import { Dot } from "./ui";

export function TransactionRow({ t, actions }: { t: Transaction; actions?: ReactNode }) {
  const income = t.kind === "INCOME";
  return (
    <li className="flex items-center gap-3 py-3">
      <Dot color={t.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
        <p className="truncate text-xs text-slate-500">
          {formatDate(t.date)} · {t.category.name} · {t.account.name}
        </p>
      </div>
      <span className={`tabular-nums text-sm font-semibold ${income ? "text-emerald-600" : "text-slate-900"}`}>
        {income ? "+" : "−"} {formatBRL(t.amount)}
      </span>
      {actions}
    </li>
  );
}
