// Mirrors the API contract in docs/superpowers/plans/2026-11-13-fintrack.md. Money = integer cents.
export type Kind = "INCOME" | "EXPENSE";
export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH";

export type User = { id: string; name: string; email: string; isGuest: boolean };
export type Account = { id: string; name: string; type: AccountType; initialBalance: number; balance: number };
export type Category = { id: string; name: string; color: string; kind: Kind };
export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string;
  kind: Kind;
  amount: number;
  date: string;
  description: string;
  category: Pick<Category, "id" | "name" | "color">;
  account: Pick<Account, "id" | "name">;
};
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type Budget = {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  spent: number;
  category: Pick<Category, "id" | "name" | "color">;
};
export type Dashboard = {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  byCategory: { categoryId: string; name: string; color: string; total: number }[];
  last12Months: { month: string; income: number; expense: number }[];
  recent: Transaction[];
};

export type TxFilters = {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  kind?: Kind;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "date" | "amount";
  order?: "asc" | "desc";
};

export const ACCOUNT_TYPES: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CREDIT_CARD: "Cartão de crédito",
  CASH: "Dinheiro",
};
