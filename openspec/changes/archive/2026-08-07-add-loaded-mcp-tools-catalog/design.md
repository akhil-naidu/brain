## Context

See `proposal.md` for why. Today `/tools` and the composer integrations menu show connection status (connected / sign-in / setup) and enable toggles. Tool **usage** appears only as stream parts in chat. eve exposes agent inspection via `GET /eve/v1/info` (tools, connections, etc.) under the project’s eve channel auth — Brain must not require Vercel OIDC for this path.

## Goals / Non-Goals

**Goals:**

- Session-gated catalog API for MCP tools of **connected** connections in the active workspace.
- `/tools` UI that lists tools (name, description, connection), with empty/error/loading states.
- Refresh on focus / after connect-disconnect without a chat turn.

**Non-Goals:**

- Per-tool enable/disable toggles (Cursor-like fine control) in v1.
- Listing built-in sandbox tools in v1 unless they fall out of the same MCP connection filter for free.
- Changing MCP OAuth token layout or introducing Vercel Connect.

## Decisions

### 1. Host API lists MCP tools via `tools/list` (not eve `/info`)

- **Choice:** Next route `GET /api/connections/tools` requires Better Auth session + active workspace, then for each **connected** Brain MCP provider calls remote `tools/list` with `@ai-sdk/mcp` using the user’s stored OAuth token (`getStoredAccessToken` + principal/workspace issuer).
- **Why:** Spike showed `GET /eve/v1/info` returns connection metadata + authored/framework tools, **not** remote MCP tool catalogs. Direct `tools/list` matches Cursor-like “loaded tools” and keeps workspace-scoped grants.
- **Alternatives:** Client calls `/eve/v1/info` — insufficient tool data; browser→MCP direct — rejected (would expose tokens).

### 2. Scope: MCP connection tools only when connected

- **Choice:** Filter to tools owned by Brain’s official MCP connections that report **connected** for this user/workspace. If eve info returns a flat tool list, map via connection id / naming conventions documented in implementation.
- **Why:** Matches user mental model (“what did Connect give me?”) and avoids dumping harness internals.
- **Alternatives:** Show all agent tools — deferred.

### 3. UI primary on `/tools`

- **Choice:** New “Loaded tools” section on `/tools` under the MCP tab (or sibling tab if density requires). Composer menu may show a count link (“12 tools”) later; not required for v1 gate.
- **Why:** `/tools` already owns connection management; Cursor-like browse fits there.
- **Alternatives:** Composer-only popover — secondary.

### 4. Failure modes

- **Choice:** If eve is down or inspection fails, return a clear API error; UI shows retry. Do not fabricate an empty catalog as success when the fetch failed.
- **Why:** Empty vs error must stay distinguishable.

### 5. Caching

- **Choice:** No durable cache in v1; short in-request dedupe only. Client refetches on mount/focus after connect.
- **Why:** Tool lists can change after OAuth; keep beta simple.

## Risks / Trade-offs

- **[Risk] eve `/info` shape incomplete for MCP tool descriptions** → Probe during implement; fall back to name-only rows; extend via connection-specific listTools if eve exposes a narrower API.
- **[Risk] Tools listed before OAuth finishes mid-turn** → Only include connections already `connected` in Brain’s status API.
- **[Risk] Large tool lists (Slack/GitHub)** → Virtualize or collapse by connection; search filter if > N tools.
- **[Trade-off] Server hop through Next** → Extra latency vs direct eve; acceptable for a settings page.

## Migration Plan

1. Land API + `/tools` section behind no flag (beta).
2. No data migration.
3. Rollback: revert UI/API; connections/chat unchanged.

## Open Questions

- Exact eve info JSON path for per-connection MCP tools — confirm against installed `eve` version during task 1 spike; adjust mapper only, not specs.
