# Brain

**Beta** · self-hosted work assistant for your team.

Browser chat, MCP connections (Slack, Asana, Gmail, Notion, Linear, Atlassian, Zernio, Sentry, GitHub, ClickUp, dFlow, Snowflake, MongoDB, MCP Toolbox, Rybbit, Bytebot), workspaces, playbooks, and schedules — running on **your** host with **your** Postgres. No Vercel AI Gateway, Neon, or Vercel Connect required.

**Customer docs (in-app):** after `pnpm dev`, open [`/docs`](http://localhost:3000/docs) — quickstart, architecture, self-hosting, and environment reference.

**Architecture:** [diagram](./docs/brain-architecture-diagram.png) · [executive overview](./docs/brain-executive-overview.md) · [technical](./docs/brain-technical-architecture.md)

Built with [Next.js](https://nextjs.org/) + [`eve`](https://eve.dev/) (`withEve()`).

| | |
| --- | --- |
| Version | `0.1.0-beta.0` |
| License | [MIT](./LICENSE) |
| Node | **24.x** (see `.nvmrc`) |
| Package manager | **pnpm** ≥ 11 |

---

## Features

- **Signed-in browser chat** — Better Auth (email/password), sessions in Postgres
- **Workspaces** — personal + team workspaces, invites, roles, optional SSO/SCIM
- **MCP connections** — Connect from the chat menu (OAuth / DCR); browse loaded tools on `/tools`; env credentials as deploy fallback
- **Durable history** — chats, playbooks, and schedules in operator Postgres
- **Schedules** — morning brief + playbook schedules (needs production eve process)
- **Model picker** — Command Code built-ins, or custom OpenAI-compatible endpoints (Azure AI Foundry, Ollama, company proxies)
- **Self-hostable** — Dockerfile / Dokku / dFlow Enterprise; operator Postgres (no SQLite fallback)

---

## Requirements

- Node.js **24.x** (`nvm use`)
- [pnpm](https://pnpm.io/) 11+ (`corepack enable`)
- Docker (for local Postgres via Compose)
- A model path: `COMMAND_CODE_API_KEY` for built-ins, **or** a custom OpenAI-compatible endpoint after first sign-in

---

## Quick start (local)

**Local setup** (tools, fork, `.env`, operator, Ollama, first chat): after `pnpm dev`, open [`/docs/getting-started/local-setup`](http://localhost:3000/docs/getting-started/local-setup). Source: [`content/docs/getting-started/local-setup.mdx`](./content/docs/getting-started/local-setup.mdx).

```bash
# 1. Install (fork https://github.com/akhil-naidu/brain first, then clone YOUR fork)
git clone https://github.com/YOUR_GITHUB_USERNAME/brain.git
cd brain
nvm use          # Node 24
corepack enable
pnpm install

# 2. Postgres
docker compose up -d db

# 3. Env
cp .env.example .env
# Required at minimum:
#   COMMAND_CODE_API_KEY=...          # omit if you only use custom models
#   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   BRAIN_BOOTSTRAP_TOKEN=$(openssl rand -base64 32)   # paste on /setup
#   BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain
#   BRAIN_PUBLIC_URL=http://localhost:3000
#   BETTER_AUTH_URL=http://localhost:3000
# Optional (schedules only):
#   BRAIN_INTERNAL_TOKEN=$(openssl rand -base64 32)
#   BRAIN_INTERNAL_URL=http://127.0.0.1:3000          # default; set if Next is not on :3000

# 4. Dev server (Next + eve)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

1. First host with an empty DB → **`/setup`** (create the operator account)
2. Sign in → **`/chat`**
3. Connect MCP apps and browse loaded tools on **`/tools`**

> **Tip:** Vitest uses a separate database `brain_test` (created by Compose init) so `pnpm test` / `pnpm verify` will not wipe your local operator account on `brain`.  
> If `brain_test` is missing on an older volume:  
> `docker compose exec db psql -U brain -d brain -c 'CREATE DATABASE brain_test;'`  
> To reset local auth data entirely: `docker compose down -v && docker compose up -d db`, then open `/setup`.

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `BRAIN_DATABASE_URL` | **Yes** | Postgres URL (`DATABASE_URL` also accepted) |
| `BETTER_AUTH_SECRET` | **Yes** | Session signing (`openssl rand -base64 32`) |
| `COMMAND_CODE_API_KEY` | Built-ins | Curated Command Code models (omit only if you rely solely on custom models) |
| `BRAIN_PUBLIC_URL` | Prod | Public origin (cookies, OAuth redirects, SEO) |
| `BETTER_AUTH_URL` | Prod | Usually same as `BRAIN_PUBLIC_URL` |
| `BRAIN_BOOTSTRAP_TOKEN` | Prod | Required to create the first operator |
| `BRAIN_INTERNAL_TOKEN` | Schedules | Bearer between eve ↔ Next for scheduled runs |
| `BRAIN_INTERNAL_URL` | Schedules | Next origin for due-sweep (default `http://127.0.0.1:3000`) |

MCP client IDs/secrets (`SLACK_MCP_*`, `GITHUB_MCP_*`, …) are optional when using Menu Connect; they remain a deploy-time fallback.

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js + eve (primary local workflow) |
| `pnpm build` | `eve build` + `next build` |
| `pnpm start` | Production: eve on `:4274`, then Next on `:3000` |
| `pnpm verify` | `format:check` → `lint` → `typecheck` → `test` |
| `pnpm test` | Vitest (needs `BRAIN_DATABASE_URL` for DB tests) |
| `pnpm run openspec:validate` | Validate OpenSpec specs/changes |

---

## Architecture

Brain is a **private client** on your host: Postgres for product data, a model endpoint you choose, and **live MCP tools** — not a RAG copy of Slack or Snowflake, and not a public Claude/ChatGPT workspace.

![Brain logical architecture](./docs/brain-architecture-diagram.png)

| Plane | What lives there |
| --- | --- |
| Product data | Accounts, transcripts, playbooks, schedules in operator Postgres |
| Models | Command Code (default) or a custom OpenAI-compatible endpoint (including Azure AI Foundry) |
| Live tools | Current tasks, mail, deploys, SQL via MCP at request time |

Stakeholder write-ups: [executive overview](./docs/brain-executive-overview.md) · [technical architecture](./docs/brain-technical-architecture.md). In-app: [`/docs/self-hosting/architecture`](http://localhost:3000/docs/self-hosting/architecture).

---

## Production deploy

Brain is designed for self-hosting (Dokku, **dFlow Enterprise**, Docker, etc.).

1. Provision **Postgres 16+** (any operator Postgres — not Neon-required)
2. Set runtime env **before** first healthy boot (`BRAIN_DATABASE_URL`, secrets, public URL)
3. Deploy with the repo **Dockerfile** (builds eve + Next; starts via `scripts/start-production.mjs`)
4. Open `/setup` with `BRAIN_BOOTSTRAP_TOKEN` to create the operator
5. Persist **`.eve/`** if you use Menu Connect (MCP tokens are file-based)

**Full Dokku / dflow guide:** [`docs/deploy-dokku.md`](./docs/deploy-dokku.md)

### Runtime

```
Browser → Next (:3000)
            ├─ Better Auth + Brain APIs → Postgres
            └─ /eve/v1/* (withEve proxy) → eve Nitro (:4274)
```

- Schema is applied on boot (Better Auth migrations + Brain tables)
- No SQLite fallback; no SQLite→Postgres data migration (greenfield cutover)
- App routes that need auth are **dynamic** — Docker builds do not require a live DB

---

## Project layout

```
agent/           eve agent, connections (MCP), schedules
app/             Next.js App Router (chat UI, auth, APIs)
components/      Shared UI
lib/             Auth, Postgres, chat stores, SEO
content/docs/    Customer docs (Fumadocs → /docs)
docs/            Architecture overviews, deploy notes, design/plans (engineering)
openspec/        Behavior specs and change proposals
scripts/         Production start, bootstrap helpers
docker-compose.yml   Local Postgres 16
Dockerfile           Production image
```

---

## Development notes

- **No Vercel platform lock-in** for core paths — see `AGENTS.md` and `.cursor/rules/no-vercel-infra.mdc`
- Lint is **oxlint** (not ESLint); zero warnings (`--deny-warnings`)
- Architecture overviews: [`docs/brain-executive-overview.md`](./docs/brain-executive-overview.md), [`docs/brain-technical-architecture.md`](./docs/brain-technical-architecture.md)
- Design docs: `docs/superpowers/specs/`
- Implementation plans: `docs/superpowers/plans/`
- Agent-oriented guidance: [`AGENTS.md`](./AGENTS.md)

### Quality gate

```bash
docker compose up -d db
export BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain
pnpm run verify
```

CI (`.github/workflows/verify.yml`) runs the same chain plus `pnpm run build` against a Postgres service.

---

## Security notes

- Treat the host as trusted: MCP tokens and some credentials live under `.eve/`
- Set strong `BETTER_AUTH_SECRET` / `BRAIN_BOOTSTRAP_TOKEN` / `BRAIN_INTERNAL_TOKEN` in production
- Prefer private network + SSL for Postgres (`?sslmode=require` when required)
- Keep `BRAIN_PUBLIC_URL` accurate behind reverse proxies so OAuth callbacks stay correct

---

## License

[MIT](./LICENSE) © 2026 Akhil Naidu

Third-party packages retain their own licenses (eve, Next.js, Better Auth, etc.).
