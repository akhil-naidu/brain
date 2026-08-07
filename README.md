# Brain

**Beta** · self-hosted work assistant for your team.

Browser chat, MCP connections (Slack, Asana, Gmail, GitHub, ClickUp, dFlow), workspaces, playbooks, and schedules — running on **your** host with **your** Postgres. No Vercel AI Gateway, Neon, or Vercel Connect required.

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
- **MCP connections** — Connect from the chat menu (OAuth / DCR); env credentials as deploy fallback
- **Durable history** — chats, playbooks, and schedules in operator Postgres
- **Schedules** — morning brief + playbook schedules (needs production eve process)
- **Model picker** — Command Code (or other direct providers), not Vercel AI Gateway
- **Self-hostable** — Dockerfile / Dokku / dflow; single Postgres URL

---

## Requirements

- Node.js **24.x** (`nvm use`)
- [pnpm](https://pnpm.io/) 11+ (`corepack enable`)
- Docker (for local Postgres via Compose)
- A model API key (`COMMAND_CODE_API_KEY`)

---

## Quick start (local)

```bash
# 1. Install
git clone https://github.com/akhil-naidu/brain.git
cd brain
nvm use          # Node 24
corepack enable
pnpm install

# 2. Postgres
docker compose up -d db

# 3. Env
cp .env.example .env
# Required at minimum:
#   COMMAND_CODE_API_KEY=...
#   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   BRAIN_DATABASE_URL=postgres://brain:brain@127.0.0.1:5432/brain
#   BRAIN_PUBLIC_URL=http://localhost:3000
#   BETTER_AUTH_URL=http://localhost:3000

# 4. Dev server (Next + eve)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

1. First host with an empty DB → **`/setup`** (create the operator account)
2. Sign in → **`/chat`**

> **Tip:** Vitest uses the same Compose Postgres. If `/setup` disappears after running tests, wipe the volume:  
> `docker compose down -v && docker compose up -d db`

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `BRAIN_DATABASE_URL` | **Yes** | Postgres URL (`DATABASE_URL` also accepted) |
| `BETTER_AUTH_SECRET` | **Yes** | Session signing (`openssl rand -base64 32`) |
| `COMMAND_CODE_API_KEY` | **Yes** | Model provider |
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

## Production deploy

Brain is designed for self-hosting (Dokku, dflow, Docker, etc.).

1. Provision **Postgres 16+** (any operator Postgres — not Neon-required)
2. Set runtime env **before** first healthy boot (`BRAIN_DATABASE_URL`, secrets, public URL)
3. Deploy with the repo **Dockerfile** (builds eve + Next; starts via `scripts/start-production.mjs`)
4. Open `/setup` with `BRAIN_BOOTSTRAP_TOKEN` to create the operator
5. Persist **`.eve/`** if you use Menu Connect (MCP tokens are file-based)

**Full Dokku / dflow guide:** [`docs/deploy-dokku.md`](./docs/deploy-dokku.md)

### Architecture (runtime)

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
docs/            Deploy notes + design/plans
openspec/        Behavior specs and change proposals
scripts/         Production start, bootstrap helpers
docker-compose.yml   Local Postgres 16
Dockerfile           Production image
```

---

## Development notes

- **No Vercel platform lock-in** for core paths — see `AGENTS.md` and `.cursor/rules/no-vercel-infra.mdc`
- Lint is **oxlint** (not ESLint); zero warnings (`--deny-warnings`)
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
