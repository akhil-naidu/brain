## Context

Brain’s browser chat used a single anonymous eve principal. Auth must land before any remote DB work. Chat persistence stays on host SQLite behind `ChatStore`.

Constraints: no Sign in with Vercel, no `vercelOidc()`, no Neon/hosted DB requirement; stay on host-local SQLite for chats and Better Auth user/session tables in this change.

## Goals / Non-Goals

Goals:
- Better Auth email/password sessions for the Brain UI
- Bootstrap for the first operator account; open signup disabled afterward
- Map session user id → eve `user` principal
- Per-user chat rows and MCP token scoping
- Internal bearer for scheduled operator runs

Non-goals:
- Hosted Postgres for chats
- Vercel OIDC / Connect
- Full org/RBAC admin UI

## Decisions

### 1. Better Auth (not Clerk / Vercel OIDC)
- **Choice:** `better-auth` with `emailAndPassword`, database sessions, and `node:sqlite` (`DatabaseSync`) under `.eve/brain-auth.sqlite`.
- **Why:** First-class email/password + SQLite adapter, cookie sessions that map cleanly to eve `AuthFn`, plugin path for later 2FA/org without Vercel lock-in.
- **Secret / URL:** `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL` / `BRAIN_PUBLIC_URL`.

### 2. Host SQLite for auth tables
- **Choice:** Better Auth schema (`user`, `session`, `account`, `verification`) via `getMigrations` on startup. Chats remain in `.eve/brain-chats.sqlite`.
- **Why:** Same self-host story as chats; no hosted DB.

### 3. Bootstrap-only first user
- **Choice:** `/setup` + `/api/auth/bootstrap` (optional `BRAIN_BOOTSTRAP_TOKEN`; required in production). Signup through Better Auth is gated with `databaseHooks` so only the bootstrap path can create users.
- **Why:** Fresh hosts need an operator without leaving public self-signup open.

### 4. Chat `user_id` scoping
- **Choice:** Every chat row owned by session user id. Legacy rows reassigned from `__legacy__` on bootstrap.
- **Migration:** Existing rows without `user_id` assigned to first/bootstrap user.

### 5. Schedules use operator principal
- **Choice:** `BRAIN_OPERATOR_USER_ID` (default first user) + `BRAIN_INTERNAL_TOKEN` bearer for server-side eve runs.
- **Why:** Schedulers have no browser cookie.

## Risks / Mitigations

- **[Risk] Better Auth + eve AuthFn cookie plumbing behind `withEve()`** → Resolve session from the inbound `Request` headers in `AuthFn`; keep internal bearer for schedules.
- **[Risk] BREAKING for prior “no login” local UX** → Document upgrade: bootstrap after pull; recreate `.eve/brain-auth.sqlite` if an older auth schema is present.
- **[Risk] Schema drift** → Run Better Auth migrations on process start before handling auth routes.

## Rollout

1. Ship Better Auth + bootstrap + session→principal mapping.
2. Migrate SQLite chats: `user_id`, backfill to first/bootstrap user.
3. Gate chat/connection APIs and eve channel on session.
