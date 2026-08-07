# eve Agent App

This project uses the eve framework. Before writing code, read the relevant guide
from the installed eve package docs. In most installs, those docs are at
`node_modules/eve/docs/`. In workspaces or local package installs, resolve the
installed `eve` package location first and read its `docs/` directory. If
package docs are unavailable, use https://eve.dev/docs as a fallback.

## Infrastructure policy

This agent must stay **self-hostable and independent of Vercel infrastructure**.

- Models: Command Code (or other direct/third-party providers) — not Vercel AI Gateway
- Hosting: `eve build` + `eve start` (or any non-Vercel host)
- Auth: Better Auth email/password sessions (self-hosted Postgres) — never `vercelOidc()` or Vercel Connect
- Sandbox: microsandbox / Docker / local — not Vercel Sandbox
- OAuth for connections: `defineInteractiveAuthorization` or your own `getToken`
- ClickUp: official MCP with self-hosted OAuth / DCR (`agent/connections/clickup.ts`)
- dFlow: official Cloud MCP with self-hosted OAuth / DCR (`agent/connections/dflow.ts`)
- Slack / Asana / Gmail / GitHub: official MCP with self-hosted OAuth + env client credentials (`agent/connections/{slack,asana,gmail,github}.ts`)

See `.cursor/rules/no-vercel-infra.mdc`.

## Quality gate

Package manager is **pnpm** (`pnpm-lock.yaml`). Use `corepack enable` (or install
pnpm 11+) — do not use npm/yarn for installs.

Run `pnpm run verify` before finishing any change. It chains
`format:check` → `lint` → `typecheck` → `test`, and CI (`.github/workflows/verify.yml`)
runs the same chain plus `pnpm run build`.

- **Node 24 is required** (`.nvmrc`); `eve` declares `>=24`. Run `nvm use` first.
- **Lint is oxlint**, not ESLint. `typescript-eslint` declares `typescript: <6.1.0`
 and cannot support this repo's TypeScript 7, so type-aware linting goes through
 `oxlint --type-aware` (backed by `oxlint-tsgolint`). Config: `.oxlintrc.json`.
- **Zero warnings is the bar.** `pnpm run lint` passes `--deny-warnings`. Fix the
 underlying types rather than adding `oxlint-disable`, `any`, or `!`.
- **`next build` needs `experimental.useTypeScriptCli`.** Next 16 drives the
 TypeScript compiler API directly, which TypeScript 7 (tsgo) does not expose;
 the flag routes build-time checking through the TypeScript CLI instead.

## Chat UI

- Run `pnpm run dev` (Next.js + `withEve()`) for the Brain browser chat UI — primary workflow
- Agent terminal (`eve dev` / `pnpm run dev:eve`) is optional for debugging only
- Login required: Better Auth + Postgres (`BRAIN_DATABASE_URL`); chats and MCP tokens are per signed-in user
- Local DB: `docker compose up -d db` then set `BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain`
- First host: open `/setup` (or `node scripts/bootstrap-operator.mjs`) to create the operator account; set `BETTER_AUTH_SECRET`
- Template reference mirror: `/Users/dev/github/tmp/eve-chat-template` (see `.cursor/rules/eve-chat-template-reference.mdc`)

## OpenSpec

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for behavior specs and change proposals.

- Specs: `openspec/specs/`
- Active changes: `openspec/changes/`
- Config: `openspec/config.yaml`
- Cursor slash commands: `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, `/opsx-explore`, …
- Validate: `pnpm run openspec:validate`

Ordered implementation checklists for the Brain chat UI live separately in
`docs/superpowers/plans/` (do not relocate). Design overviews:
`docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md` (chat UI),
`docs/superpowers/specs/2026-08-06-brain-auth-tenancy-design.md` (auth, workspaces, MCP tenancy).
