## Why

Brain already connects to work apps (ClickUp, Slack, Asana, Gmail). Operators who run stacks on dFlow need the same pattern for deploy/debug: list apps, environments, services, logs, and templates via official dFlow MCP OAuth.

## What Changes

- Add a self-hosted dFlow MCP OAuth connection (DCR, no env client secrets)
- Surface dFlow in the integrations menu, status API, and Connect flow
- Mark read/list tools as auto-approved; writes require user approval
- Document the connection in AGENTS.md / `.env.example`

## Capabilities

### New Capabilities

- _(none — extends existing mcp-connections)_

### Modified Capabilities

- `mcp-connections`: Add official dFlow MCP connection requirements
- `connection-status-menu`: Include dFlow in status listing (via shared provider list)
- `connection-connect-menu`: Include dFlow in menu Connect (via shared provider list)

## Impact

- `agent/connections/dflow.ts`
- Integrations menu + `EnabledConnections`
- `agent/lib/connection-status.ts` provider list
- Instructions / docs mentions
- No Vercel Connect; uses dFlow Cloud OAuth + DCR
