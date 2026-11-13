import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import { useApiMutation, useCategories } from "../api/hooks";
import type { Category, Kind } from "../api/types";
import { Button, Card, Dot, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";

const PALETTE = ["#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#84cc16", "#eab308", "#64748b"];

function CategoryForm({ initial, onDone }: { initial?: Category; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "EXPENSE");
  const save = useApiMutation(() => {
    const body = { name, color, kind };
    return initial ? api(`/categories/${initial.id}`, { method: "PATCH", body }) : api("/categories", { method: "POST", body });
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined, { onSuccess: onDone }); }}>
      <Field label="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      </Field>
      <Field label="Tipo">
        <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </Select>
      </Field>
      <div>
        <span className="text-sm font-medium text-slate-700">Cor</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={color === c}
              className={`h-7 w-7 rounded-full ring-offset-2 ${color === c ? "ring-2 ring-slate-900" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <ErrorBox error={save.error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <Button disabled={save.isPending}>Salvar</Button>
      </div>
    </form>
  );
}

export function CategoriesPage() {
  const { data, isPending, error } = useCategories();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const del = useApiMutation((id: string) => api(`/categories/${id}`, { method: "DELETE" }));

  const column = (kind: Kind, title: string) => (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>
      <ul className="divide-y divide-slate-100">
        {data?.filter((c) => c.kind === kind).map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <Dot color={c.color} />
            <span className="flex-1 text-sm text-slate-700">{c.name}</span>
            <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
              <Pencil size={15} />
            </button>
            <button
              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => confirm(`Excluir a categoria "${c.name}"?`) && del.mutate(c.id)}
              aria-label={`Excluir ${c.name}`}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <>
      <PageHeader title="Categorias" actions={<Button onClick={() => setEditing("new")}><Plus size={16} /> Nova categoria</Button>} />
      <ErrorBox error={error ?? del.error} />
      {isPending ? <Spinner /> : (
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {column("EXPENSE", "Despesas")}
          {column("INCOME", "Receitas")}
        </div>
      )}
      <Modal title={editing === "new" ? "Nova categoria" : "Editar categoria"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && <CategoryForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
