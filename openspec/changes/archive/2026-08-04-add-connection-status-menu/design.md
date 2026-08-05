## Context

See proposal.md — Why. Tokens live in `.eve/mcp-oauth-<name>.json` via `agent/lib/mcp-oauth.ts`. Chat uses anonymous principal `user:local:anonymous`.

## Goals / Non-Goals

**Goals:**
- Read-only status for clickup/slack/asana/gmail
- Menu labels without starting a chat turn
- Unit tests for status classification

**Non-Goals:**
- “Connect now” OAuth kickoff from the menu
- Live MCP health checks / remote revoke detection

## Decisions

1. **`getConnectionAuthStatus(provider, principal, env)`** — needs_setup (missing env) → else peek store: connected if usable or refreshable token, else needs_sign_in. No network refresh in the status path.
2. **API** — `GET /api/connections/status` → `{ connections: [{ id, displayName, status }] }`.
3. **UI** — fetch on menu open; show muted/destructive subtitle under the name.
4. **Principal** — fixed anonymous chat principal matching `agent/channels/eve.ts`.

## Risks / Trade-offs

- [Status can be stale until menu reopen] → Accept; add refresh on open.
- [Expired token with failed refresh still shows connected] → Accept for v1 peek without network.
