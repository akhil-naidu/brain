## Why

OAuth **tokens** are already keyed by signed-in user, but Menu Connect still has host-wide gaps: any authenticated user can rewrite shared MCP **app credentials**, and **pending** OAuth state is one file per provider so concurrent Connect flows can clobber each other. Auth + per-user chats/playbooks are in place; connections need to match that isolation for multi-user hosts.

## What Changes

- Scope **pending Menu OAuth** state per signed-in user (no single shared `mcp-oauth-pending-{connection}.json` race).
- Restrict **credential setup** (`PUT`/`DELETE` `/api/connections/[id]/setup`) to the host **operator** (or equivalent); other signed-in users may still Connect / Disconnect their own grants and read setup metadata needed to connect when credentials already exist.
- Ensure **disconnect** clears only that user’s token and that user’s pending attempt (not another user’s in-flight OAuth).
- Keep OAuth **access/refresh tokens** per principal (already `user:brain:{userId}`); no change to “User B does not inherit User A’s tokens.”
- Keep static **app** credentials (client id/secret) **host-wide** by design (one registered OAuth app / redirect URI per Brain host), but no longer world-writable by every account.
- Update connect/status menu specs away from “local chat principal” wording to signed-in user.
- Non-goals: Vercel Connect / `vercelOidc()`; per-user Slack/Google **app** registrations; auto-migration of pre-auth anonymous token keys; changing which MCP providers exist.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `connection-connect-menu`: Pending OAuth per user; setup mutations operator-only; disconnect does not clobber others’ pending flows; callbacks bind to the initiating user.
- `connection-status-menu`: Status remains per signed-in user (clarify wording vs “chat principal”).
- `mcp-connections`: Clarify host-wide app credentials vs per-user grants; no requirement that every user can rewrite setup.

## Impact

- `agent/lib/connection-authorize.ts`, `agent/lib/connection-credentials.ts`, `agent/lib/mcp-oauth.ts` (pending paths)
- `app/api/connections/[id]/{setup,authorize,callback,disconnect}/`
- `lib/auth/operator.ts` (or shared `requireOperatorSession`) for setup writes
- Tests under `tests/agent/connection-*.test.ts`
- OpenSpec main specs for connect/status/mcp-connections after archive
