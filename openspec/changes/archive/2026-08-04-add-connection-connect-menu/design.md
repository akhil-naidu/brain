## Context

See proposal.md — Why. Eve interactive OAuth only starts mid-turn (framework-owned webhook callback). Menu Connect needs a separate Brain-owned loop that writes the same token store (`mcp-oauth.ts`) used by connection `getToken`.

## Goals / Non-Goals

**Goals:**
- Start OAuth from the integrations menu for needs_sign_in connections
- Complete OAuth via a stable Brain callback URL and store the token for `user:local:anonymous`
- Refresh menu status after connect (poll / focus)
- Block Connect when needs_setup (missing client credentials)

**Non-Goals:**
- Replacing eve mid-turn authorize UI (still works)
- Disconnect / revoke from the menu
- Remote MCP health checks
- Multi-user principals

## Decisions

1. **Brain-owned callback** — `GET/POST /api/connections/[id]/callback` with absolute URL from request origin. Operators register this stable URI (in addition to any eve turn callback they already use).
2. **Pending PKCE store** — `.eve/mcp-oauth-pending-<id>.json` holds verifier/state/client until callback; cleared after success or mismatch.
3. **Reuse helpers** — `buildAuthorizeUrl`, `exchangeAuthorizationCode`, `storeAccessToken`, credential setup checks from existing OAuth modules.
4. **UI** — Connect button on needs_sign_in rows; opens authorize URL in a new tab; polls status while the menu is open.
5. **Label** — Change needs_sign_in copy from “Sign in when asked” to “Sign in”.

## Risks / Trade-offs

- [Operators must register a second redirect URI] → Document in `.env.example`; ClickUp DCR registers per callback automatically.
- [Pending file is local-trusted only] → Accept for anonymous local chat v1.
