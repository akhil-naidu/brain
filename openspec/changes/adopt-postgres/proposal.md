## Why

Brain now has multi-user auth, workspaces, and durable chats on host SQLite. SQLite is fine for a single process on one machine, but it blocks concurrent multi-instance deploys and is a weak default for a shared team host. There is no production data to preserve, so this is a clean cutover to Postgres.

## What Changes

- **BREAKING:** Replace host SQLite (`.eve/brain-auth.sqlite`, `.eve/brain-chats.sqlite`) with a single Postgres database as the durable store for auth, workspaces, chats, playbooks, and schedules.
- Require a Postgres connection URL (`DATABASE_URL` / `BRAIN_DATABASE_URL`) for app boot in normal/dev/prod (tests may use a disposable Postgres or an in-process test container).
- Wire Better Auth to Postgres; rewrite chat / workspace / user-data stores from `node:sqlite` to Postgres SQL.
- Apply schema on startup (Better Auth migrations + Brain tables); no SQLite→Postgres data import tooling.
- Keep self-hostable: any Postgres the operator provides. **Do not** require Neon, Supabase, Vercel Postgres, or other hosted-only products.
- Update env docs (`.env.example`) and OpenSpec persistence language that currently mandates SQLite.

### Non-goals

- No SQLite data migration / import scripts (no existing data).
- No Neon, Drizzle-as-Vercel-template path, Upstash, Vercel Connect, or `vercelOidc()`.
- No change to eve agent model path (Command Code), MCP OAuth product behavior, or chat UI features beyond the storage backend.
- No multi-region replication or managed-DB vendor lock-in.

## Capabilities

### New Capabilities

- `postgres-persistence`: Operator-configured Postgres is the durable system of record; connection, schema apply, and failure modes when the DB is missing or unreachable.

### Modified Capabilities

- `chat-persistence`: Durable chat history must use the Postgres store instead of host-local SQLite; remove the “SQLite by default / works without DB credentials” requirement.
- `user-auth`: Better Auth sessions and accounts must persist in Postgres instead of host SQLite files.

## Impact

- **Code:** `lib/auth/server.ts` and SQLite helpers; `lib/auth/workspaces/*`; `lib/chat/store/*`; `lib/chat/user-data/*`; SSO/SCIM/domain stores typed on `DatabaseSync`; tests that open SQLite files.
- **Deps:** Add a Postgres client (`pg` or `postgres`); remove reliance on `node:sqlite` for product data.
- **Ops:** Operators must run Postgres and set a connection URL; local `pnpm dev` needs Docker Compose or an external Postgres.
- **APIs:** HTTP shapes stay the same; only the backing store changes.
