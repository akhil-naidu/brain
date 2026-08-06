## Why

Auth now gives each signed-in user a stable `user.id`, but playbooks still live in browser `localStorage` and schedules in host-wide `.eve/*.json`. That blocks multi-user ownership and loses playbooks across browsers. Persist both in host SQLite scoped by the session user.

## What Changes

- Move saved playbooks from browser storage to host SQLite keyed by `user_id`.
- Move playbook schedules and morning-brief schedule config from `.eve/*.json` to SQLite keyed by `user_id`.
- Gate playbook/schedule APIs with the authenticated session (same pattern as chats).
- When a schedule fires, run as the **owning user’s** principal (still using `BRAIN_INTERNAL_TOKEN` as the headless credential).
- **BREAKING** for shared host schedule JSON: schedules become per-user; migrate existing `.eve` schedule files to the first/operator user once.
- Optional one-time client import of legacy `localStorage` playbooks into the signed-in user’s store.
- Keep limits and UI surfaces (composer menus, `/playbooks`, `/schedules`) behaviorally familiar.

## Capabilities

### New Capabilities

_(none — extend existing capabilities)_

### Modified Capabilities

- `saved-playbooks`: Persist on host SQLite per user; require sign-in; drop browser-only storage as the source of truth.
- `scheduled-playbooks`: Persist schedules per user in SQLite; runs bind to owning user.
- `scheduled-morning-brief`: Persist morning-brief config per user; Slack delivery uses that user’s Slack token.

## Impact

- `lib/chat/playbooks.ts`, playbook UI hooks/APIs
- `lib/chat/scheduled-playbooks.ts`, `lib/chat/scheduled-brief.ts`, schedule APIs + runners
- `lib/chat/run-scheduled-prompt.ts` — owner user id from schedule row
- New/extended SQLite store(s) under `.eve/` (can share chats DB or a dedicated file)
- Tests for store scoping + API auth
- No Vercel infra; no hosted Postgres
