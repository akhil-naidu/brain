## Why

After connecting an MCP app, Brain only shows connection status and in-chat tool calls when the agent uses a tool. Operators and users cannot browse the loaded tool catalog the way Cursor does, which makes it hard to know what the agent can do after Connect.

## What Changes

- Add a **loaded MCP tools catalog** for the signed-in user’s active workspace: name, description, and owning connection for tools available from connected (and optionally enabled) MCP apps.
- Expose a host API that returns this catalog without requiring a chat turn.
- Show the catalog on **`/tools`** (primary) and optionally a compact entry from the composer connections menu.
- Refresh after connect/disconnect and on page focus.
- Keep existing in-chat tool call rendering unchanged.

Non-goals:

- No Vercel Connect, `vercelOidc()`, Neon, or AI Gateway.
- Not a full Cursor IDE tools panel (no edit/disable individual MCP tool schemas in v1).
- Not changing OAuth grant storage or per-user/workspace isolation rules.
- Not listing eve built-in sandbox tools (`bash`, `readFile`, …) in v1 unless they already appear via the same inspection path with negligible cost — prefer MCP connection tools only for clarity.

## Capabilities

### New Capabilities

- `mcp-tools-catalog`: Signed-in users can inspect which MCP tools are loaded for their active workspace after connections are authorized, without starting a chat turn.

### Modified Capabilities

- `connection-status-menu`: Tools page / integrations surfaces MAY link to or summarize the loaded tools catalog when a connection is connected.

## Impact

- New Next API route (session-gated) that resolves tools for connected MCP apps via eve inspection / connection metadata (prefer `GET /eve/v1/info` or equivalent self-hosted path; no Vercel OIDC).
- UI: `/tools` catalog section; optional composer affordance.
- Tests for API authz, workspace isolation, and empty/connected states.
- Docs: brief note in README `/tools` description.
