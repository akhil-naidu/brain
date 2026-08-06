## Why

MCP OAuth app credentials are host-wide today. Teams that need their own Slack/Asana/Gmail/GitHub apps cannot override the platform/instance app per workspace, which blocks real multi-tenant Connect.

## What Changes

- Store optional workspace BYOA credentials per workspace + provider
- Resolve order: workspace BYOA → host stored → env → DCR
- Workspace owner/admin can set/clear BYOA; instance admin still manages host apps
- Thread active workspace into authorize/status credential checks
- Workspace settings UI for static-credential providers

Non-goals: per-user OAuth apps, license gates on BYOA, changing grant keying, email delivery, SSO.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `mcp-connections`: Add workspace BYOA resolve order and admin gates

## Impact

- `agent/lib/connection-credentials.ts`, mcp-oauth, connection-authorize/status
- New `/api/workspaces/connections/[id]/setup`
- `/settings/workspace` BYOA section
- Tests for resolve preference
