## Decisions

1. **Enable BA `domainVerification`** so the SSO plugin rejects unverified providers at sign-in.
2. **Brain-owned request/verify APIs** under `/api/workspaces/sso/...` so any workspace owner/admin can verify (BA’s own endpoints only allow `provider.userId`).
3. **DNS format matches Better Auth**: TXT at `_better-auth-token-{providerId}.{domain}` with value `token` or `identifier=token`.
4. **Tokens** stored in Better Auth `verification` table with identifier `_better-auth-token-{providerId}`.

## Out of scope

- SCIM provisioning
- Email-based domain verification
- Auto-reverify on domain list changes beyond resetting `domainVerified` on domain update
