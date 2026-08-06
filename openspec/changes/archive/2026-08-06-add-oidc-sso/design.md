## Context

Brain already uses Better Auth email/password with instance policies and license entitlements (`sso` flag). Design doc defers SCIM/workspace placement; this slice adds OIDC login only.

## Goals / Non-Goals

**Goals:**

- One OIDC IdP per host via env discovery URL + client credentials
- Sign-in button when configured and license allows SSO
- `sso-only` policy becomes enforceable (password UI off after bootstrap)
- JIT user create under `open` / `sso-only` with existing maxUsers hook

**Non-Goals:**

- SAML / `@better-auth/sso` package
- Runtime IdP paste UI (env is enough for self-host v1)
- Multiple concurrent IdPs
- Automatic workspace membership from IdP claims

## Decisions

1. **Use `genericOAuth`, not `@better-auth/sso`.** Built into `better-auth`; OIDC discovery covers Okta/Entra/Keycloak/Auth0-style issuers without a new dependency.
2. **Env-only IdP config.** `BRAIN_OIDC_DISCOVERY_URL` (or issuer → `/.well-known/openid-configuration`), `BRAIN_OIDC_CLIENT_ID`, `BRAIN_OIDC_CLIENT_SECRET`, optional `BRAIN_OIDC_PROVIDER_ID` (default `oidc`). Restart required to apply.
3. **License gate.** If entitlements.sso is false, do not register the OAuth provider and do not advertise SSO on signup-status.
4. **Signup modes**
   - `invite-only`: OAuth `disableSignUp: true` (login/link existing only)
   - `open` / `sso-only`: OAuth signup allowed; user.create hook treats `sso-only` like open for creation
   - `sso-only`: UI hides password form except when `bootstrapAllowed`
5. **Redirect URI.** Better Auth default `{baseURL}/api/auth/oauth2/callback/{providerId}` — document for IdP setup.

## Risks / Trade-offs

- Static Better Auth config means signup-mode changes for OAuth `disableSignUp` need either restart or dynamic config. **Mitigation:** read policies at auth bundle creation; include signupMode + OIDC env in bundle cache key so policy updates that require OAuth signup flip recreate the bundle on next process load. For in-process policy flips without restart, prefer setting `disableSignUp: false` always and enforcing create/deny in `databaseHooks.user.create` (already the password path). **Chosen:** enforce in hooks; set OAuth `disableSignUp` false and reject in hook when mode is `invite-only` (unless bootstrap/invite gate).

## Migration

No schema migration beyond Better Auth account tables from `genericOAuth` (covered by existing `getMigrations`).
