import { ArrowDownRight, ArrowUpRight, Landmark } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard } from "../api/hooks";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionRow } from "../components/TransactionRow";
import { Card, EmptyState, ErrorBox, PageHeader, Spinner } from "../components/ui";
import { currentMonth, monthShort } from "../lib/dates";
import { formatBRL } from "../lib/money";

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Landmark; tone: string }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-slate-900">{formatBRL(value)}</p>
      </div>
    </Card>
  );
}

const compact = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(cents / 100);

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isPending, error } = useDashboard(month);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral das suas finanças" actions={<MonthPicker value={month} onChange={setMonth} />} />
      <ErrorBox error={error} />
      {isPending ? (
        <Spinner />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Saldo total" value={data.totalBalance} icon={Landmark} tone="bg-slate-100 text-slate-700" />
            <Stat label="Receitas do mês" value={data.monthIncome} icon={ArrowUpRight} tone="bg-emerald-100 text-emerald-700" />
            <Stat label="Despesas do mês" value={data.monthExpense} icon={ArrowDownRight} tone="bg-rose-100 text-rose-700" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <h2 className="mb-4 font-semibold text-slate-900">Últimos 12 meses</h2>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={data.last12Months.map((m) => ({ ...m, label: monthShort(m.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={12} width={70} />
                    <Tooltip formatter={(v) => formatBRL(Number(v))} cursor={{ fill: "#f1f5f9" }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="mb-4 font-semibold text-slate-900">Gastos por categoria</h2>
              {data.byCategory.length === 0 ? (
                <EmptyState title="Sem despesas neste mês" />
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.byCategory} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {data.byCategory.map((c) => (
                            <Cell key={c.categoryId} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatBRL(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {data.byCategory.slice(0, 6).map((c) => (
                      <li key={c.categoryId} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="flex-1 text-slate-600">{c.name}</span>
                        <span className="tabular-nums font-medium">{formatBRL(c.total)}</span>
                        <span className="w-10 text-right text-xs text-slate-400">
                          {Math.round((c.total / data.monthExpense) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Últimas transações</h2>
              <Link to="/transacoes" className="text-sm font-medium text-emerald-700 hover:underline">
                Ver todas
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState title="Nenhuma transação ainda">
                <Link to="/transacoes" className="text-emerald-700">Adicione a primeira</Link> ou{" "}
                <Link to="/importar" className="text-emerald-700">importe um extrato</Link>.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent.map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
