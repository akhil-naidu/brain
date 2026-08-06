## Why

Workspace SSO providers can be claimed for any email domain today. Domain verification (DNS TXT) proves ownership before SSO login is allowed—matching Better Auth’s SSO domainVerification model.

## What Changes

- Enable `@better-auth/sso` `domainVerification.enabled`
- Unverified providers cannot complete SSO sign-in
- Workspace admins can request a verification token and verify via DNS from workspace settings
- Brain API authorizes by workspace role (not only the Better Auth provider `userId`)

## Capabilities

### New Capabilities

- `sso-domain-verification`: DNS TXT prove-ownership flow for workspace SSO domains

### Modified Capabilities

- `workspace-sso`: Providers start unverified; sign-in requires verification

## Impact

- `lib/auth/server.ts` SSO options
- `lib/auth/sso/domain-verification.ts` + API routes
- Workspace SSO UI shows DNS host/value + Verify button
