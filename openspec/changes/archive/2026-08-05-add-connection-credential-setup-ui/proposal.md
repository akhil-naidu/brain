## Why

Slack, Asana, and Gmail need a pre-registered OAuth app before Connect works. Today that means editing `.env` and restarting. Operators should be able to paste client id/secret from the chat UI when status is `needs_setup`.

## What Changes

- Persist OAuth app credentials under `.eve/mcp-app-credentials-{name}.json` (mode 0o600), preferred over env
- Add setup API (GET/PUT/DELETE) that never returns secrets
- Show Configure in the integrations menu for `needs_setup` rows, with copyable redirect URI
- After save, status becomes `needs_sign_in` so existing Connect can run
- Keep env vars as deploy-time fallback; ClickUp/dFlow DCR unchanged

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `connection-status-menu`: Needs-setup means missing stored *or* env credentials
- `connection-connect-menu`: Configure control + setup API for static-credential providers
- `mcp-connections`: App credentials may come from UI store or env

## Impact

- `agent/lib/connection-credentials.ts`, status/authorize/mcp-oauth resolve path
- `app/api/connections/[id]/setup`
- Integrations menu + setup dialog
- `.env.example` notes UI Configure as preferred path
