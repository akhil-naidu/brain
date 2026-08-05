## Why

The integrations menu only toggles whether a connection is enabled for a turn. Users can’t tell whether ClickUp/Slack/Asana/Gmail are signed in, missing env setup, or still need OAuth.

## What Changes

- Add a connections status API that reports auth/setup state for each Brain MCP connection for the local anonymous chat principal.
- Show Connected / Sign in / Needs setup under each integration in the menu.
- Keep the existing enable/disable toggle behavior.

## Capabilities

### New Capabilities

- `connection-status-menu`: Surface per-connection auth/setup status in the integrations menu.

### Modified Capabilities

- (none)

## Impact

- OAuth store status helper
- `GET /api/connections/status`
- Integrations menu UI + tests
- Non-goals: starting OAuth from the menu, multi-user principals
