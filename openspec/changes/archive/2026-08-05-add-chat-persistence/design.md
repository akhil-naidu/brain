## Context

Brain’s chat UI (Next.js + `withEve()`) is ephemeral today: `EphemeralAgentChat` starts a fresh `Client().session()` on mount, and the sidebar only shows the current in-tab title. Eve server sessions under `.eve/` are durable, but resume needs the full client `SessionState` (`sessionId` + `continuationToken` + `streamIndex`) plus stored stream events — not `sessionId` alone.

Prior OpenSpec chat-ui specs said “no durable storage for v1”; this change supersedes that for **local** history only.

## Goals / Non-Goals

**Goals:**
- Persist chats on the host with SQLite behind a `ChatStore` interface
- Sidebar: list / open / delete / new
- Resume after refresh via `useEveAgent({ initialSession, initialEvents, session })` and remount `key={chatId}`
- Keep anonymous trusted-local auth; no Vercel / Neon / Better Auth

**Non-Goals:**
- Multi-user tenancy, sync across devices, or public-internet hardening
- Postgres/Redis/ES/ClickHouse/Convex/Supabase as the v1 store
- Changing model routing or MCP OAuth

## Decisions

1. **SQLite via Node `node:sqlite`** — Node 24 is required; avoid native `better-sqlite3` build friction. File path from env (default under `.eve/brain-chats.sqlite`); gitignore the DB file.
2. **`ChatStore` interface** — UI/API depend on the interface; SQLite is the only impl now; Postgres can plug in later.
3. **Schema: `chat` + `chat_event`** — chat row holds id, title, `eve_session` JSON, timestamps; events appended by index for streaming updates.
4. **API routes under `/api/chats`** — REST list/create/get/patch/delete; patch updates title, session, and/or appends events.
5. **Client lifecycle** — new chat stays unsaved until first send (or create empty on New chat — prefer create-on-first-send to avoid empty clutter). Active `chatId` in shell; remount agent on switch. Persist on `onEvent` / `onSessionChange` / `onFinish` (debounced or batched where needed).
6. **Title** — first user message truncated for display title; editable later is out of scope.
7. **Single-tenant** — no per-user scoping; any local client can read/write (same trust model as today’s open AuthFn).

## Risks / Trade-offs

- Concurrent tabs writing the same chat can race — accept last-write / append-index conflicts for local v1.
- SQLite + Next bundling: mark routes `nodejs` runtime and keep store server-only.
- Large event logs grow the DB — acceptable for personal use; no compaction in this change.
- Old “ephemeral” docs/specs need a MODIFIED delta or archive note when syncing main specs.

## Migration

No existing durable chats. Fresh SQLite file on first use. Optional: document deleting the SQLite file to wipe history.
