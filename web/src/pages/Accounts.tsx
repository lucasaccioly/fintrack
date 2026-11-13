import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CreditCard, Landmark, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api/client";
import { useAccounts, useApiMutation } from "../api/hooks";
import { ACCOUNT_TYPES, type Account, type AccountType } from "../api/types";
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";
import { formatBRL, parseBRL } from "../lib/money";

const ICONS: Record<AccountType, typeof Landmark> = { CHECKING: Landmark, SAVINGS: PiggyBank, CREDIT_CARD: CreditCard, CASH: Banknote };

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "CASH"]),
  initialBalance: z.string().refine((v) => v.trim() === "" || parseBRL(v) !== null, "Valor inválido"),
});
type FormValues = z.infer<typeof schema>;

function AccountForm({ initial, onDone }: { initial?: Account; onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, initialBalance: (initial.initialBalance / 100).toFixed(2).replace(".", ",") }
      : { name: "", type: "CHECKING", initialBalance: "" },
  });
  const save = useApiMutation((v: FormValues) => {
    const body = { ...v, initialBalance: parseBRL(v.initialBalance) ?? 0 };
    return initial ? api(`/accounts/${initial.id}`, { method: "PATCH", body }) : api("/accounts", { method: "POST", body });
  });
  return (
    <form className="space-y-3" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: onDone }))} noValidate>
      <Field label="Nome" error={formState.errors.name?.message}>
        <Input placeholder="Ex.: Nubank" {...register("name")} />
      </Field>
      <Field label="Tipo">
        <Select {...register("type")}>
          {Object.entries(ACCOUNT_TYPES).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Saldo inicial (R$)" error={formState.errors.initialBalance?.message}>
        <Input inputMode="decimal" placeholder="0,00" {...register("initialBalance")} />
      </Field>
      <ErrorBox error={save.error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <Button disabled={save.isPending}>Salvar</Button>
      </div>
    </form>
  );
}

export function AccountsPage() {
  const { data, isPending, error } = useAccounts();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const del = useApiMutation((id: string) => api(`/accounts/${id}`, { method: "DELETE" }));
  const total = data?.reduce((s, a) => s + a.balance, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Contas"
        subtitle={data ? `Saldo consolidado: ${formatBRL(total)}` : undefined}
        actions={<Button onClick={() => setEditing("new")}><Plus size={16} /> Nova conta</Button>}
      />
      <ErrorBox error={error ?? del.error} />
      {isPending ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState title="Nenhuma conta cadastrada">Crie uma conta para começar a registrar transações.</EmptyState>
      ) : (
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => {
            const Icon = ICONS[a.type];
            return (
              <Card key={a.id} className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{ACCOUNT_TYPES[a.type]}</p>
                  </div>
                  <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setEditing(a)} aria-label={`Editar ${a.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => confirm(`Excluir a conta "${a.name}"?`) && del.mutate(a.id)}
                    aria-label={`Excluir ${a.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className={`text-2xl font-semibold tabular-nums ${a.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatBRL(a.balance)}</p>
              </Card>
            );
          })}
        </div>
      )}
      <Modal title={editing === "new" ? "Nova conta" : "Editar conta"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && <AccountForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
