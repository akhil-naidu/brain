## Why

Brain currently treats every browser caller as one shared anonymous user. Anyone who can open the UI sees every chat and can use every connected app’s OAuth grants. That is fine for a single trusted machine, but it blocks shared/team or network-exposed use. Login and per-user data scoping must come before any remote database migration.

## What Changes

- Add a self-hosted **login session** for the Brain browser UI via **Better Auth** (email/password + host SQLite) — not Sign in with Vercel, not `vercelOidc()`, not Vercel Connect.
- Replace the fixed anonymous eve channel principal with the **authenticated user’s** principal for chat turns and MCP OAuth.
- **BREAKING** for shared anonymous access: unauthenticated callers can no longer use chat history APIs, eve chat sessions, or connection authorize/status/disconnect as the shared `anonymous` user.
- Scope durable chat records in local SQLite by `user_id` so each signed-in user only lists/opens/updates/deletes their own chats.
- Scope MCP OAuth token storage to the signed-in principal (reuse existing principal-keyed token store).
- Keep SQLite as the chat store; do **not** introduce Postgres/Neon/Supabase or other hosted DB services in this change.
- Provide a first-run / bootstrap path so a fresh host can create the initial operator account without a public open signup.

Non-goals:
- Migrating chat storage to a separate DB service (Postgres/Neon/etc.) — deferred until multi-instance ops need it
- Sign in with Vercel, Vercel Connect, `vercelOidc()`, AI Gateway
- Social login marketplace / multi-IdP productization beyond Better Auth email/password for v1
- Multi-device sync, org/RBAC admin console, or billing
- Changing playbook localStorage model beyond “per browser profile” unless required for auth gating

## Capabilities

### New Capabilities

- `user-auth`: Browser login/logout sessions, protected chat/agent/connection routes, and mapping the signed-in user to an eve `AuthFn` principal.

### Modified Capabilities

- `chat-persistence`: Chat create/list/get/update/delete MUST be scoped to the authenticated user; anonymous shared history MUST end.
- `connection-connect-menu`: Authorize/callback/disconnect/setup MUST run as the signed-in principal, not a fixed anonymous id.
- `connection-status-menu`: Status MUST reflect the signed-in principal’s token/setup state.
- `mcp-connections`: Connection tooling MUST use the signed-in user’s stored grants.
- `agent-runtime`: Eve channel auth MUST reject or challenge unauthenticated browser chat use and MUST bind turns to the session user.

## Impact

- [`agent/channels/eve.ts`](agent/channels/eve.ts) — replace anonymous-only `AuthFn` with session-backed auth
- Chat APIs under `app/api/chats/` and connection APIs under `app/api/connections/`
- [`lib/chat/store/`](lib/chat/store/) — add `user_id` to SQLite schema + `ChatStore` methods; keep interface swappable for a later DB
- MCP OAuth helpers already key tokens by principal — wire principal from session
- Better Auth routes/config, UI sign-in/out chrome, `.env.example` secrets
- Scheduled brief/playbook runners may need an explicit owner principal or host-operator account (called out in design)
- Dependencies: `better-auth` + Node `node:sqlite` — no Vercel-hosted auth products
