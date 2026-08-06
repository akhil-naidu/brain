## 1. OIDC core

- [x] 1.1 Add `lib/auth/oidc.ts` env parsing + availability helpers
- [x] 1.2 Wire `genericOAuth` into Better Auth; allow JIT under open/sso-only in user.create hook
- [x] 1.3 Extend signup-status with `ssoAvailable` + provider id; update auth client plugin
- [x] 1.4 Unit tests for OIDC env resolution

## 2. UI + docs

- [x] 2.1 Sign-in: SSO button; hide password when `sso-only` (unless bootstrap)
- [x] 2.2 Instance settings short SSO status hint
- [x] 2.3 Document `BRAIN_OIDC_*` + callback URI in `.env.example`

## 3. Verify

- [x] 3.1 `pnpm exec openspec validate add-oidc-sso` and `pnpm run verify`
