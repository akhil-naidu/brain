## Why

License entitlements and `sso-only` signup mode are reserved, but Brain still only supports email/password login. Self-host/enterprise hosts need a real OIDC SSO path without Vercel auth products.

## What Changes

- Configure one host OIDC provider via env (`BRAIN_OIDC_*`) using Better Auth `genericOAuth`
- Expose SSO availability on signup-status so the sign-in UI can offer “Continue with SSO”
- Honor signup mode: `sso-only` hides password login/signup (bootstrap password path remains when the host has zero users); `invite-only` allows SSO login for existing users but not JIT signup; `open` and `sso-only` allow SSO JIT user creation (still subject to license `maxUsers`)
- Require the SSO license entitlement before enabling the OIDC plugin / SSO button
- Document redirect URI and env vars in `.env.example`

Non-goals: SAML, SCIM, multi-IdP admin UI, domain auto-placement into workspaces, IdP-initiated SSO polish.

## Capabilities

### New Capabilities

- `oidc-sso`: Host OIDC provider config, SSO sign-in, and mode/entitlement gates

### Modified Capabilities

- `user-auth`: Sign-in MAY use OIDC SSO in addition to email/password
- `instance-policies`: `sso-only` is a real signup mode that disables public password signup/login after bootstrap
- `auth-workspace-ui`: Sign-in surface shows SSO when configured

## Impact

- `lib/auth/server.ts`, `lib/auth/client.ts`, new `lib/auth/oidc.ts`
- `/api/auth/signup-status`, sign-in page, instance settings hint
- `.env.example`
