import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, FileUp, LayoutDashboard, LogOut, Menu, PiggyBank, Tags, Wallet, X } from "lucide-react";
import { useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../api/client";
import { useMe } from "../api/hooks";
import { Logo } from "./Logo";
import { Spinner } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { to: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/importar", label: "Importar CSV", icon: FileUp },
];

export function AppLayout() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (me.isPending) return <Spinner />;
  if (me.isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    qc.clear();
    navigate("/login");
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <Logo />
      </div>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          <Icon size={18} /> {label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-slate-200 pt-4">
        <p className="truncate px-3 text-sm font-medium text-slate-900">{me.data.name}</p>
        <p className="mb-2 truncate px-3 text-xs text-slate-500">{me.data.isGuest ? "Modo visitante" : me.data.email}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={18} /> Sair
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button onClick={() => setOpen(!open)} aria-label="Menu" className="rounded p-2 hover:bg-slate-100">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {me.data.isGuest && (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
            Você está no modo visitante com dados de exemplo. Eles são apagados automaticamente em 24h.
          </div>
        )}
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
