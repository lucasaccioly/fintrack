import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ApiError } from "./api/client";
import { AppLayout } from "./components/AppLayout";
import "./index.css";
import { AccountsPage } from "./pages/Accounts";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { BudgetsPage } from "./pages/Budgets";
import { CategoriesPage } from "./pages/Categories";
import { DashboardPage } from "./pages/Dashboard";
import { ImportPage } from "./pages/Import";
import { TransactionsPage } from "./pages/Transactions";

// A 401 on any data request means the session expired: re-check "me", whose 401 makes AppLayout redirect to /login.
const onError = (err: unknown, key?: readonly unknown[]) => {
  if (err instanceof ApiError && err.status === 401 && key?.[0] !== "me") {
    queryClient.resetQueries({ queryKey: ["me"] });
  }
};
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (err, query) => onError(err, query.queryKey) }),
  mutationCache: new MutationCache({ onError: (err) => onError(err) }),
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/cadastro", element: <RegisterPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "transacoes", element: <TransactionsPage /> },
      { path: "orcamentos", element: <BudgetsPage /> },
      { path: "contas", element: <AccountsPage /> },
      { path: "categorias", element: <CategoriesPage /> },
      { path: "importar", element: <ImportPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
