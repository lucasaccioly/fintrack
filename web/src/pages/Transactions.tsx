import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../api/client";
import { useAccounts, useApiMutation, useCategories, useTransactions } from "../api/hooks";
import type { Kind, Transaction, TxFilters } from "../api/types";
import { TransactionForm } from "../components/TransactionForm";
import { TransactionRow } from "../components/TransactionRow";
import { Button, Card, EmptyState, ErrorBox, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";
import { exportTransactions } from "../lib/export";

const FILTER_KEYS = ["from", "to", "accountId", "categoryId", "kind", "q", "sort", "order"] as const;

export function TransactionsPage() {
  const [params, setParams] = useSearchParams();
  const filters: TxFilters = {
    ...Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined])),
    page: Number(params.get("page") ?? 1),
    pageSize: 20,
  };
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const list = useTransactions(filters);
  const accounts = useAccounts();
  const categories = useCategories();
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [exporting, setExporting] = useState(false);
  const del = useApiMutation((id: string) => api(`/transactions/${id}`, { method: "DELETE" }));

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  async function doExport(format: "pdf" | "xlsx") {
    setExporting(true);
    try {
      await exportTransactions(filters, format);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Transações"
        subtitle={list.data ? `${list.data.total} transações encontradas` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => doExport("pdf")} disabled={exporting || !list.data?.total}>
              <FileText size={16} /> PDF
            </Button>
            <Button variant="secondary" onClick={() => doExport("xlsx")} disabled={exporting || !list.data?.total}>
              <FileSpreadsheet size={16} /> Excel
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Nova transação
            </Button>
          </>
        }
      />

      <Card className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Buscar descrição…" value={filters.q ?? ""} onChange={(e) => set("q", e.target.value)} className="lg:col-span-2" aria-label="Buscar" />
        <Input type="date" value={filters.from ?? ""} onChange={(e) => set("from", e.target.value)} aria-label="De" />
        <Input type="date" value={filters.to ?? ""} onChange={(e) => set("to", e.target.value)} aria-label="Até" />
        <Select value={filters.kind ?? ""} onChange={(e) => set("kind", e.target.value as Kind)} aria-label="Tipo">
          <option value="">Receitas e despesas</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </Select>
        <Select value={filters.accountId ?? ""} onChange={(e) => set("accountId", e.target.value)} aria-label="Conta">
          <option value="">Todas as contas</option>
          {accounts.data?.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Select value={filters.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.kind === "INCOME" ? "receita" : "despesa"})
            </option>
          ))}
        </Select>
        <Select
          value={`${filters.sort ?? "date"}:${filters.order ?? "desc"}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(":");
            const next = new URLSearchParams(params);
            next.set("sort", sort);
            next.set("order", order);
            next.delete("page");
            setParams(next, { replace: true });
          }}
          aria-label="Ordenar"
        >
          <option value="date:desc">Mais recentes</option>
          <option value="date:asc">Mais antigas</option>
          <option value="amount:desc">Maior valor</option>
          <option value="amount:asc">Menor valor</option>
        </Select>
        <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>
          Limpar filtros
        </Button>
      </Card>

      <ErrorBox error={list.error ?? del.error} />
      <Card className="py-1">
        {list.isPending ? (
          <Spinner />
        ) : list.data?.items.length ? (
          <ul className="divide-y divide-slate-100">
            {list.data.items.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                actions={
                  <span className="flex gap-1">
                    <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(t)} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => confirm(`Excluir "${t.description}"?`) && del.mutate(t.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                }
              />
            ))}
          </ul>
        ) : (
          <div className="py-4">
            <EmptyState title="Nenhuma transação encontrada">Ajuste os filtros ou adicione uma nova transação.</EmptyState>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" disabled={filters.page! <= 1} onClick={() => set("page", String(filters.page! - 1))} aria-label="Página anterior">
            <ChevronLeft size={16} />
          </Button>
          <span className="text-slate-600">
            Página {filters.page} de {totalPages}
          </span>
          <Button variant="secondary" disabled={filters.page! >= totalPages} onClick={() => set("page", String(filters.page! + 1))} aria-label="Próxima página">
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      <Modal title={editing === "new" ? "Nova transação" : "Editar transação"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && <TransactionForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
