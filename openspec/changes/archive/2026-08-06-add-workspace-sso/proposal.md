## Why

Host env `genericOAuth` SSO is the wrong shape: enterprise teams need each **team workspace** to configure its own IdP from the UI (Better Auth `@better-auth/sso`), not one install-wide discovery URL.

## What Changes

- **BREAKING** relative to the short-lived env OIDC slice: remove `BRAIN_OIDC_*` / `genericOAuth`
- Add `@better-auth/sso` with providers stored in Better Auth `ssoProvider`, `organizationId` = Brain workspace id
- Workspace Settings UI for OIDC + SAML (owner/admin, team workspaces only)
- Sign-in via email-domain HRD (`signIn.sso({ email })`)
- On SSO login, auto-add membership to the linked workspace
- License `sso` entitlement still gates the feature; instance `sso-only` still hides password after bootstrap

## Capabilities

### New Capabilities

- `workspace-sso`: Per-workspace IdP config, HRD sign-in, membership provisioning

### Modified Capabilities

- `user-auth`: SSO sign-in is email-domain HRD, not a single host OIDC button
- `auth-workspace-ui`: Workspace settings expose SSO; sign-in shows company SSO
- `oidc-sso` (prior change): superseded — env host OIDC removed

## Impact

- `lib/auth/server.ts`, `lib/auth/client.ts`, new `lib/auth/sso/*`
- `/api/workspaces/sso`, workspace settings UI, sign-in page
- Dependency `@better-auth/sso`
- Remove `lib/auth/oidc.ts` and env docs
