import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api/client";
import { useAccounts, useApiMutation, useCategories } from "../api/hooks";
import type { Transaction } from "../api/types";
import { today } from "../lib/dates";
import { parseBRL } from "../lib/money";
import { Button, ErrorBox, Field, Input, Select } from "./ui";

const schema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  amount: z.string().refine((v) => (parseBRL(v) ?? 0) > 0, "Valor inválido"),
  date: z.string().min(1, "Informe a data"),
  accountId: z.string().min(1, "Escolha a conta"),
  categoryId: z.string().min(1, "Escolha a categoria"),
});
type FormValues = z.infer<typeof schema>;

export function TransactionForm({ initial, onDone }: { initial?: Transaction; onDone: () => void }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const { register, handleSubmit, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, amount: (initial.amount / 100).toFixed(2).replace(".", ",") }
      : { kind: "EXPENSE", date: today(), description: "", amount: "", accountId: "", categoryId: "" },
  });
  const kind = watch("kind");
  const save = useApiMutation((v: FormValues) => {
    const body = { ...v, amount: parseBRL(v.amount) };
    return initial
      ? api(`/transactions/${initial.id}`, { method: "PATCH", body })
      : api("/transactions", { method: "POST", body });
  });

  const errors = formState.errors;
  return (
    <form className="space-y-3" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: onDone }))} noValidate>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(["EXPENSE", "INCOME"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => {
              setValue("kind", k);
              setValue("categoryId", "");
            }}
            className={`rounded-md py-1.5 text-sm font-medium ${
              kind === k ? (k === "EXPENSE" ? "bg-white text-rose-600 shadow" : "bg-white text-emerald-600 shadow") : "text-slate-500"
            }`}
          >
            {k === "EXPENSE" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>
      <Field label="Descrição" error={errors.description?.message}>
        <Input {...register("description")} placeholder="Ex.: Supermercado" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="0,00" {...register("amount")} />
        </Field>
        <Field label="Data" error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </Field>
      </div>
      <Field label="Conta" error={errors.accountId?.message}>
        <Select {...register("accountId")}>
          <option value="">Selecione…</option>
          {accounts.data?.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Categoria" error={errors.categoryId?.message}>
        <Select {...register("categoryId")}>
          <option value="">Selecione…</option>
          {categories.data
            ?.filter((c) => c.kind === kind)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </Select>
      </Field>
      <ErrorBox error={save.error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <Button disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}
