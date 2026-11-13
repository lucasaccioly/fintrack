import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import { useApiMutation, useBudgets, useCategories } from "../api/hooks";
import type { Budget } from "../api/types";
import { MonthPicker } from "../components/MonthPicker";
import { Button, Card, Dot, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";
import { budgetStatus } from "../lib/budget";
import { currentMonth } from "../lib/dates";
import { formatBRL, parseBRL } from "../lib/money";

function BudgetForm({ month, initial, onDone }: { month: string; initial?: Budget; onDone: () => void }) {
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [limit, setLimit] = useState(initial ? (initial.limit / 100).toFixed(2).replace(".", ",") : "");
  const save = useApiMutation(() => api("/budgets", { method: "PUT", body: { categoryId, month, limit: parseBRL(limit) } }));
  const valid = categoryId && (parseBRL(limit) ?? 0) > 0;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(undefined, { onSuccess: onDone }); }}>
      <Field label="Categoria">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!initial}>
          <option value="">Selecione…</option>
          {categories.data?.filter((c) => c.kind === "EXPENSE").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Limite mensal (R$)">
        <Input inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <ErrorBox error={save.error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <Button disabled={!valid || save.isPending}>Salvar</Button>
      </div>
    </form>
  );
}

export function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isPending, error } = useBudgets(month);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const del = useApiMutation((id: string) => api(`/budgets/${id}`, { method: "DELETE" }));
  const over = data?.filter((b) => b.spent >= b.limit * 0.8) ?? [];

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Defina limites mensais por categoria de despesa"
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <Button onClick={() => setEditing("new")}><Plus size={16} /> Novo orçamento</Button>
          </>
        }
      />
      <ErrorBox error={error ?? del.error} />
      {over.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            {over.length === 1 ? "1 orçamento passou" : `${over.length} orçamentos passaram`} de 80% do limite:{" "}
            <strong>{over.map((b) => b.category.name).join(", ")}</strong>.
          </p>
        </div>
      )}
      {isPending ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState title="Nenhum orçamento neste mês">Crie um limite para acompanhar seus gastos por categoria.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((b) => {
            const s = budgetStatus(b.spent, b.limit);
            return (
              <Card key={b.id} className="cursor-pointer transition hover:border-slate-300" onClick={() => setEditing(b)}>
                <div className="mb-3 flex items-center gap-2">
                  <Dot color={b.category.color} />
                  <span className="flex-1 font-medium text-slate-900">{b.category.name}</span>
                  <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir o orçamento de ${b.category.name}?`)) del.mutate(b.id); }}
                    aria-label={`Excluir orçamento de ${b.category.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(s.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.min(100, s.pct * 100)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="tabular-nums text-slate-600">{formatBRL(b.spent)} de {formatBRL(b.limit)}</span>
                  <span className={`tabular-nums font-medium ${s.text}`}>{Math.round(s.pct * 100)}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Modal title={editing === "new" ? "Novo orçamento" : "Editar orçamento"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && <BudgetForm month={month} initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
