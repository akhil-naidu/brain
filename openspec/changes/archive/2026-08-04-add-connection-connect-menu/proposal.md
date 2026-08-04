## Why

The integrations menu now shows Connected / Sign in / Needs setup, but users still cannot start OAuth from the menu. They must wait until a chat turn hits a connection tool. Operators need a proactive Connect control.

## What Changes

- Add a Brain-owned OAuth start + callback API for ClickUp, Slack, Asana, and Gmail
- Show a Connect control in the integrations menu when a connection needs sign-in
- Persist tokens into the existing local MCP OAuth store for the anonymous chat principal
- Document the stable menu callback redirect URI operators must register

## Capabilities

### New Capabilities

- `connection-connect-menu`: Start and complete MCP connection OAuth from the integrations menu without a chat turn

### Modified Capabilities

- `connection-status-menu`: Sign-in label wording may update now that Connect is available from the menu

## Impact

- `agent/lib/` OAuth helpers and pending-state storage
- `app/api/connections/` authorize + callback routes
- `components/chat/integrations-menu.tsx` and client helpers
- `.env.example` redirect URI notes
- No Vercel Connect; self-hosted OAuth only
