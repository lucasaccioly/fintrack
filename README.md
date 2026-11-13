<div align="center">

# 💸 FinTrack

**Controle de finanças pessoais full-stack: dashboards, orçamentos com alertas, importação de extratos bancários e exportação em PDF/Excel.**

[![CI](https://github.com/lucasaccioly/fintrack/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasaccioly/fintrack/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=white)

**[🔗 Acessar a demo](https://fintrack-amber-pi.vercel.app)** · clique em **"Entrar como visitante"** para explorar com dados de exemplo, sem cadastro.

<img src="docs/screenshots/dashboard.png" alt="Dashboard do FinTrack" width="900" />

</div>

## ✨ Funcionalidades

- **Dashboard** com saldo consolidado, receitas × despesas do mês, gastos por categoria e histórico de 12 meses
- **Transações** com filtros combináveis (período, conta, categoria, tipo, busca), ordenação e paginação, tudo refletido na URL
- **Orçamentos mensais** por categoria, com alerta ao passar de 80% e de 100% do limite
- **Importação de extrato CSV** com mapeamento de colunas, detecção automática do formato brasileiro (`31/01/2026`, `1.234,56`, separador `;`, Windows-1252) e prévia que destaca linhas inválidas antes de importar
- **Exportação** das transações filtradas em **PDF** e **Excel**
- **Contas** (corrente, poupança, cartão, dinheiro) com saldo calculado e **categorias** personalizáveis
- **Modo visitante**: cada visitante ganha um usuário isolado com 6 meses de dados realistas, removido automaticamente após 24h
- Layout **responsivo**, do celular ao desktop

| Transações | Orçamentos |
|---|---|
| <img src="docs/screenshots/transacoes.png" alt="Lista de transações com filtros" /> | <img src="docs/screenshots/orcamentos.png" alt="Orçamentos com barras de progresso" /> |

| Importação de CSV | Mobile |
|---|---|
| <img src="docs/screenshots/importar.png" alt="Assistente de importação de CSV" /> | <img src="docs/screenshots/mobile.png" alt="Dashboard no celular" width="260" /> |

## 🏗️ Arquitetura

```mermaid
flowchart LR
  B[Navegador<br/>React SPA] -- "/api/* (cookie httpOnly)" --> F[Vercel Function<br/>Express + Zod]
  F -- Prisma 7 + adapter pg --> D[(PostgreSQL<br/>Neon)]
  C[Vercel Cron<br/>diário] -- Bearer CRON_SECRET --> F
```

Monorepo com npm workspaces, publicado como **um único projeto na Vercel** (front estático + API serverless no mesmo domínio):

```
fintrack/
├── web/       React 19 · Vite · Tailwind 4 · TanStack Query · React Hook Form · Recharts
├── server/    Express 5 · Prisma 7 · Zod · JWT · testes de integração (Vitest + Supertest)
├── api/       entrypoint serverless da Vercel (reexporta o app Express)
└── vercel.json
```

## 🧠 Decisões técnicas

- **Dinheiro em centavos (inteiros)** no banco, na API e no front. Nada de `float` para valores monetários; a formatação em R$ acontece só na tela.
- **Isolamento por usuário em toda consulta.** Acessar o recurso de outro usuário retorna `404` (não `403`), para não revelar que o ID existe. Há testes para isso em todas as rotas.
- **Datas como `DATE` do Postgres**, sempre lidas e gravadas em UTC: uma transação de 31/01 nunca "vira" 30/01 por fuso horário.
- **Agregações no SQL** (`groupBy`, `date_trunc`/`to_char`) em vez de carregar tudo e somar em JavaScript.
- **Validação com Zod** em toda entrada da API, com erros padronizados `{ error, details }`.
- **Autenticação por JWT em cookie `httpOnly` + `SameSite=Lax`**: o token não fica acessível a JavaScript (mitiga XSS) e o front e a API compartilham o domínio.
- **Integridade**: não é possível excluir conta/categoria com transações (`409`), nem lançar despesa em categoria de receita.
- **Parser de CSV próprio** (RFC 4180) com testes para os formatos que bancos brasileiros realmente exportam.

## 🧪 Testes

```bash
npm test
```

- **API**: testes de integração contra um PostgreSQL real (auth, isolamento entre usuários, filtros, paginação, importação, orçamentos, dashboard e limpeza de visitantes).
- **Front**: parser de CSV, conversão de valores/datas em formato brasileiro, regras de alerta de orçamento.
- **CI**: GitHub Actions roda typecheck, testes e build a cada push.

## 🚀 Rodando localmente

Pré-requisito: **Node.js 22+**. Não precisa de Docker: o projeto sobe um PostgreSQL embutido via npm.

```bash
git clone https://github.com/lucasaccioly/fintrack.git
cd fintrack
npm install
cp .env.example server/.env
npm run db -w server                 # terminal 1: PostgreSQL local na porta 54329
npm run migrate -w server            # cria as tabelas
npm run dev -w server                # terminal 2: API em http://localhost:3001
npm run dev -w web                   # terminal 3: app em http://localhost:5173
```

> Com Docker, `docker compose up -d` substitui o primeiro comando.

## 🌐 Deploy

Demo: **https://fintrack-amber-pi.vercel.app**

Publicado na **Vercel** com banco **Neon** (PostgreSQL serverless). Variáveis de ambiente: `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`. As migrações rodam no build (`npm run vercel-build`) e a limpeza de visitantes roda via Vercel Cron.

## 📄 Licença

[MIT](LICENSE) © Lucas Accioly
