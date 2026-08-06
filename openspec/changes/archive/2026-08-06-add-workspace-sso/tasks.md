## 1. Planning cleanup

- [x] 1.1 Supersede/archive env-based `add-oidc-sso` artifacts
- [x] 1.2 Remove `genericOAuth` + `BRAIN_OIDC_*` code and docs

## 2. Core

- [x] 2.1 Add `@better-auth/sso` plugin + client; provisionUser → workspace membership
- [x] 2.2 SQLite provider store + domain uniqueness
- [x] 2.3 Workspace SSO HTTP API (owner/admin, team, license)

## 3. UI

- [x] 3.1 Workspace settings SSO section (OIDC + SAML)
- [x] 3.2 Sign-in company SSO (email HRD); strip env SSO UI

## 4. Verify

- [x] 4.1 Unit tests + `pnpm run verify`
