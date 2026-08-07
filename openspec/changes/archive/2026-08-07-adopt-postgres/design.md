## Context

See `proposal.md` for why. Today Better Auth, workspaces, chats, playbooks, and schedules use `node:sqlite` files under `.eve/`. Stores take a `DatabaseSync` handle. There is no production data to migrate. Constraints: self-hostable Postgres URL only — no Neon/Vercel DB requirement, no Drizzle-as-Vercel-template stack, no SQLite fallback after cutover.

## Goals / Non-Goals

**Goals:**

- One Postgres database for auth + Brain product tables.
- Clear `DATABASE_URL` / `BRAIN_DATABASE_URL` configuration and fail-fast without it.
- Preserve existing HTTP/API behavior and tenancy rules; only the backend changes.
- Local dev via Docker Compose Postgres; CI/tests against Postgres (container or service).

**Non-Goals:**

- SQLite→Postgres data migration tooling.
- Keeping SQLite as an alternate production backend.
- Introducing Neon, Supabase, Upstash, or `vercelOidc()`.
- Reworking MCP OAuth token file layout in this change (unless a store already lives in SQLite — then move that table with the rest).

## Decisions

### 1. Single database, two logical areas

- **Choice:** One Postgres database. Better Auth owns its tables; Brain owns `workspace*`, `chat*`, playbook/schedule, bootstrap claim, SSO helper tables, etc.
- **Why:** Simpler ops than splitting auth vs app DBs; transactional membership + chat tenancy later if needed.
- **Alternatives:** Separate auth DB — rejected for beta complexity.

### 2. Client: `pg` pool (node-postgres)

- **Choice:** Use `pg` with a shared pool module (`lib/db/pool.ts`). Better Auth’s Postgres dialect / pool adapter. Brain stores use parameterized SQL via the pool (or a thin query helper), not `node:sqlite`.
- **Why:** Widely supported by Better Auth; no ORM lock-in; avoids Neon/Drizzle template path called out in repo policy.
- **Alternatives:** `postgres` (postgres.js) — fine alternate if Better Auth wiring is cleaner; Drizzle — deferred to keep policy surface clear.

### 3. Schema apply on boot

- **Choice:** On `ensureAuthReady` / app init: run Better Auth migrations against Postgres, then idempotent Brain `ENSURE`/`CREATE TABLE IF NOT EXISTS` (or versioned SQL migrations in `lib/db/migrations/`) for Brain tables.
- **Why:** Fresh empty DB becomes usable without a separate CLI for beta; matches current SQLite “migrate on open” habit.
- **Alternatives:** External `pnpm db:migrate` only — still add a script, but boot MUST apply or refuse to serve if schema missing.

### 4. Env vars

- **Choice:** Prefer `BRAIN_DATABASE_URL`, accept `DATABASE_URL` as alias. Document in `.env.example`. Remove `BRAIN_AUTH_DB_PATH` / `BRAIN_CHATS_DB_PATH` as production paths (delete or ignore).
- **Why:** Familiar `DATABASE_URL`; Brain-prefixed alias matches other Brain env vars.

### 5. Local/dev Postgres

- **Choice:** Add `docker-compose.yml` (or extend existing) with Postgres 16+, default URL for local `.env`. Document `pnpm`/`docker compose up -d` before `pnpm dev`.
- **Why:** Zero-data greenfield; developers need a one-command DB.

### 6. Tests

- **Choice:** Vitest integration tests that need a DB use `BRAIN_DATABASE_URL` pointing at CI Postgres service or testcontainers; unit tests that mocked SQLite move to pool mocks or SQL against disposable DB.
- **Why:** SQLite-in-memory was convenient; Postgres parity matters for SQL differences (`RETURNING`, types, concurrency).

### 7. Cutover

- **Choice:** Delete SQLite store implementations after Postgres stores pass verify; no dual-write.
- **Why:** No data to keep; dual path increases risk.

## Risks / Trade-offs

- **[Risk] Local setup friction** → Compose file + `.env.example` + fail-fast message with the compose command.
- **[Risk] SQL dialect bugs (SQLite → Postgres)** → Port stores carefully; add focused store tests; watch `BOOLEAN`, timestamps, `JSON`/`JSONB`, `INSERT OR IGNORE` → `ON CONFLICT`.
- **[Risk] Better Auth adapter mismatch** → Follow current Better Auth Postgres docs for the installed version; pin pool lifecycle to process.
- **[Risk] Connection pool exhaustion under Next.js** → Singleton pool in `globalThis` for dev HMR; modest `max` for serverless-like multi-instance later.
- **[Trade-off] Boot-time migrations** → Convenient for beta; operators who want gated migrations can add a CLI later without changing the “schema exists before serve” requirement.

## Migration Plan

1. Land Postgres pool + schema ensure + Better Auth wiring.
2. Port workspace/auth helper stores, then chat + user-data stores.
3. Point env/docs at Postgres; remove SQLite paths from runtime.
4. Update CI to start Postgres; run `pnpm verify`.
5. Operators: provision Postgres, set URL, start Brain on empty DB (bootstrap as today).
6. Rollback: redeploy previous revision still on SQLite only if that binary is kept — no automated down-migration of Postgres data (none expected).

## Open Questions

- Whether CI uses GitHub Actions Postgres service or testcontainers — decide during tasks without changing specs.
