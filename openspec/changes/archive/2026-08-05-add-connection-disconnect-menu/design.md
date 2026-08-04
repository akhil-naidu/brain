## Context

See proposal.md — Why. Tokens live in `.eve/mcp-oauth-<name>.json` via `deleteStoredToken`. Menu Connect already uses the anonymous chat principal.

## Goals / Non-Goals

**Goals:**
- Delete the local token for a connected chat connection
- Offer Disconnect only when status is connected
- Clear any pending menu OAuth attempt for that connection

**Non-Goals:**
- Remote revoke / IdP token revocation
- Multi-user principals
- Confirm dialog (v1: immediate disconnect; can add confirm later)

## Decisions

1. **`DELETE /api/connections/[id]/disconnect`** — idempotent; succeeds even if no token exists.
2. **Reuse `deleteStoredToken`** for the anonymous principal.
3. **UI** — Disconnect button on connected rows (mirrors Connect); reload status after success.

## Risks / Trade-offs

- [No remote revoke] → Accept; document as local disconnect only.
- [No confirm dialog] → Accept for trusted local UI; accidental click is recoverable via Connect.
