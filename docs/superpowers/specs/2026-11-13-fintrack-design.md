# FinTrack — Design

Data: 2026-11-13 · Status: aguardando aprovação

## Por quê
Projeto de portfólio para busca de vaga como Desenvolvedor Full-Stack. Precisa mostrar,
para um recrutador ou tech lead, domínio do stack atual (React + Node/TypeScript + Postgres),
boas práticas (testes, validação, CI) e um produto que dá para **clicar e usar** numa demo online.

## Objetivos
- App de finanças pessoais completo, com demo pública no ar.
- Código organizado e legível, que aguente uma revisão em entrevista técnica.
- README que vende o projeto em 30 segundos (prints, GIF, link da demo, stack, como rodar).

## Não-objetivos
- Integração com bancos (Open Finance), multi-moeda, app mobile, multiusuário por conta.
- Filas, WebSocket, IA (ficam para o projeto Kanban).

## Anti-objetivos (falha mesmo se funcionar)
- Demo lenta ou quebrada quando o recrutador abrir.
- Um visitante conseguir apagar ou ver dados de outro.
- Qualquer menção a sistemas da empresa onde o Lucas trabalha.

## Abordagens consideradas
| | Hospedagem | Trade-off |
|---|---|---|
| **A (escolhida)** | Vercel (front + API serverless) + Neon Postgres | 1 conta só, sem "hibernar"; não permite processos longos (não precisa) |
| B | Vercel + Render + Neon | 3 contas; API hiberna e demora ~50s no 1º acesso |
| C | Railway / Fly.io | pedem cartão / sem plano grátis |

Escolhida pelo Lucas: **A**.

## Funcionalidades
1. **Autenticação:** cadastro, login, logout. JWT em cookie httpOnly (mesmo domínio na Vercel).
2. **Entrar como visitante:** cria usuário temporário com ~6 meses de dados de exemplo.
   Limpeza diária via Vercel Cron apaga visitantes com mais de 24h.
3. **Contas:** conta corrente, poupança, cartão, dinheiro; saldo calculado.
4. **Categorias:** padrão ao criar usuário + personalizadas (nome, cor, tipo receita/despesa).
5. **Transações:** CRUD, filtros (período, conta, categoria, tipo, busca), paginação, ordenação.
6. **Importação CSV:** upload → mapear colunas (data, descrição, valor) → prévia → escolher conta → importar.
   Aceita formatos brasileiros (`dd/mm/aaaa`, `1.234,56`, separador `;`).
7. **Orçamentos:** limite mensal por categoria, barra de progresso, alerta ao passar de 80% e 100%.
8. **Dashboard:** saldo total, receitas × despesas do mês, gastos por categoria (rosca),
   evolução de 12 meses (barras), últimas transações.
9. **Exportação:** transações filtradas em PDF e Excel.

## Stack (decidida pelo Lucas)
- **Front:** React + TypeScript + Vite + Tailwind + TanStack Query + React Router + React Hook Form + Zod.
- **API:** Node + TypeScript + Express + Prisma + PostgreSQL + Zod.
- **Testes:** Vitest + Supertest (API contra Postgres real); Vitest nos utilitários do front.
- **Dev local:** Docker Compose (Postgres) + `npm run dev` sobe front e API.
- **CI:** GitHub Actions — lint, typecheck e testes (Postgres como service container).

## Estrutura (minha decisão)
Monorepo com npm workspaces, um único projeto na Vercel:
```
fintrack/
  web/        # React (build -> web/dist)
  server/     # Express app, Prisma, regras de negócio, testes
  api/        # entrypoint serverless da Vercel: reexporta o app do server
  vercel.json # build do web, rewrite /api/* -> função
```

## Modelo de dados (minha decisão)
- `User` (id, name, email único, passwordHash, isGuest, createdAt)
- `Account` (id, userId, name, type, initialBalance)
- `Category` (id, userId, name, color, kind: INCOME|EXPENSE)
- `Transaction` (id, userId, accountId, categoryId, kind, amount, date, description)
- `Budget` (id, userId, categoryId, month `AAAA-MM`, limit) — único por (categoria, mês)
- Valores em **centavos (inteiro)**, nunca float. Toda consulta filtra por `userId` (isolamento).

## Segurança
- Senha com bcrypt; JWT assinado com `JWT_SECRET`; cookie httpOnly, `SameSite=Lax`, `Secure` em produção.
- Validação Zod em toda entrada da API; erros padronizados `{ error, details }`.
- Rota de limpeza protegida por `CRON_SECRET`.

## Decisões minhas (para o Lucas conferir)
- UI e README em **português**; código (nomes de variáveis, commits) em **inglês**, padrão de mercado.
- Gráficos com Recharts; exportação gerada no navegador.
- O repositório `SistemaFinanceiroJAVA` é renomeado para `fintrack` (GitHub redireciona o nome antigo).
- Sem limite de criação de visitantes por IP na v1 (atalho: serverless não tem memória compartilhada;
  adicionar via Upstash se houver abuso).

## O que depende do Lucas
- Criar conta na Vercel ("Continue with GitHub"), importar o repositório e adicionar o Neon
  pelo Marketplace da Vercel. Eu deixo o passo a passo e as variáveis de ambiente prontas.

## Fica a critério de quem constrói
Layout exato das telas, paleta, bibliotecas de PDF/Excel, estrutura interna de pastas do front.
