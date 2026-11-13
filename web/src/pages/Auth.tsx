import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { api } from "../api/client";
import type { User } from "../api/types";
import { Logo } from "../components/Logo";
import { Button, Card, ErrorBox, Field, Input } from "../components/ui";

const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Nome muito curto"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

function useAuthSuccess() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  return (user: User) => {
    qc.clear();
    qc.setQueryData(["me"], user);
    navigate(from, { replace: true });
  };
}

function GuestButton() {
  const onSuccess = useAuthSuccess();
  const guest = useMutation({ mutationFn: () => api<User>("/auth/guest", { method: "POST" }), onSuccess });
  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => guest.mutate()} disabled={guest.isPending}>
        <Sparkles size={16} className="text-amber-500" />
        {guest.isPending ? "Preparando dados de exemplo…" : "Entrar como visitante"}
      </Button>
      <ErrorBox error={guest.error} />
    </>
  );
}

function Shell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm text-slate-500">Controle suas finanças pessoais em um só lugar.</p>
        </div>
        <Card className="space-y-4 p-6">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {children}
          <div className="relative py-1 text-center text-xs text-slate-400">
            <span className="relative z-10 bg-white px-2">ou</span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
          </div>
          <GuestButton />
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const onSuccess = useAuthSuccess();
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(loginSchema) });
  const login = useMutation({
    mutationFn: (body: z.infer<typeof loginSchema>) => api<User>("/auth/login", { method: "POST", body }),
    onSuccess,
  });
  return (
    <Shell title="Entrar" footer={<>Não tem conta? <Link className="font-medium text-emerald-700" to="/cadastro">Criar conta</Link></>}>
      <form className="space-y-3" onSubmit={handleSubmit((v) => login.mutate(v))} noValidate>
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <ErrorBox error={login.error} />
        <Button className="w-full" disabled={login.isPending}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Shell>
  );
}

export function RegisterPage() {
  const onSuccess = useAuthSuccess();
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(registerSchema) });
  const signup = useMutation({
    mutationFn: (body: z.infer<typeof registerSchema>) => api<User>("/auth/register", { method: "POST", body }),
    onSuccess,
  });
  return (
    <Shell title="Criar conta" footer={<>Já tem conta? <Link className="font-medium text-emerald-700" to="/login">Entrar</Link></>}>
      <form className="space-y-3" onSubmit={handleSubmit((v) => signup.mutate(v))} noValidate>
        <Field label="Nome" error={formState.errors.name?.message}>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <ErrorBox error={signup.error} />
        <Button className="w-full" disabled={signup.isPending}>
          {signup.isPending ? "Criando…" : "Criar conta"}
        </Button>
      </form>
    </Shell>
  );
}
