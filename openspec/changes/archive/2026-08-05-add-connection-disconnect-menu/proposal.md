## Why

The integrations menu can Connect and show status, but connected apps have no way to drop the local token. Operators need Disconnect so they can switch accounts or clear a bad grant without deleting store files by hand.

## What Changes

- Add a disconnect API that deletes the stored OAuth token for the local chat principal
- Show Disconnect in the integrations menu for connected apps
- Refresh status after disconnect so the row returns to Sign in / Connect

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `connection-connect-menu`: Add Disconnect control and token-clear API for connected apps

## Impact

- `agent/lib/connection-authorize.ts` (or adjacent helper)
- `app/api/connections/[id]/disconnect`
- Integrations menu + client helpers
- Local token store only — does not revoke at the identity provider
