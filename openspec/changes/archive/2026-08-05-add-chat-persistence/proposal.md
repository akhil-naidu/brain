## Why

Brain’s chat UI is ephemeral: refresh or closing the tab loses the conversation, and the sidebar only shows the current in-tab session. That blocks daily use. Durable local history makes Brain a real work assistant without introducing cloud DB or auth platforms.

## What Changes

- Persist chats on the Brain host using a **local SQLite** file (not Neon, Supabase, Redis, etc.).
- Sidebar lists past chats; users can open, delete, and start new chats.
- Resume an opened chat with stored eve `SessionState` + stream events so the UI and follow-up turns work after reload.
- Introduce a `ChatStore` interface with a SQLite implementation so a different backend can be swapped later without rewriting the UI.
- Keep anonymous / trusted local auth as today (no Better Auth, no login gate).

Non-goals for this change:
- Multi-user auth, multi-device sync, or public-internet tenancy
- Neon / Drizzle / Postgres / Redis / Elasticsearch / ClickHouse / Convex / Supabase
- Vercel Connect, AI Gateway, or other forbidden Vercel infra
- Model picker (separate follow-up)

## Capabilities

### New Capabilities

- `chat-persistence`: Local durable chat history — list/create/open/delete chats, store eve session cursor + events, resume after refresh.

### Modified Capabilities

- (none — chat UI behavior for history was never in main `openspec/specs/`; this adds a new capability)

## Impact

- Next.js API routes under `app/api/chats/`
- Chat shell + sidebar UI (`brain-chat-shell`, `sidebar`, agent chat remount/resume)
- New `lib/chat/store/` (interface + SQLite)
- SQLite file path via env (default under `.eve/` or project data dir); document in `.env.example`
- Dependencies: Node built-in `node:sqlite` (Node 24) — no hosted DB services
- Updates design note that v1 “no persistence” is superseded for local SQLite history
