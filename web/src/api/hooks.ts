import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "./client";
import type { Account, Budget, Category, Dashboard, Page, Transaction, TxFilters, User } from "./types";

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api<User>("/auth/me"), retry: false, staleTime: Infinity });

export const useAccounts = () => useQuery({ queryKey: ["accounts"], queryFn: () => api<Account[]>("/accounts") });
export const useCategories = () =>
  useQuery({ queryKey: ["categories"], queryFn: () => api<Category[]>("/categories") });
export const useTransactions = (f: TxFilters) =>
  useQuery({
    queryKey: ["transactions", f],
    queryFn: () => api<Page<Transaction>>(`/transactions${qs(f)}`),
    placeholderData: (prev) => prev,
  });
export const useBudgets = (month: string) =>
  useQuery({ queryKey: ["budgets", month], queryFn: () => api<Budget[]>(`/budgets${qs({ month })}`) });
export const useDashboard = (month: string) =>
  useQuery({ queryKey: ["dashboard", month], queryFn: () => api<Dashboard>(`/dashboard${qs({ month })}`) });

/** Any money change can affect every screen; invalidate all data queries (not "me"). */
export function useInvalidateData() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
}

export function useApiMutation<V, R = unknown>(fn: (vars: V) => Promise<R>) {
  const invalidate = useInvalidateData();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate() });
}
