## Context

Brain workspaces are custom SQLite (not Better Auth `organization()`). dflow cloud uses `@better-auth/sso` with UI forms and domain HRD, but sets `organizationId: null`. Brain needs workspace linkage.

## Decisions

1. **`@better-auth/sso`**, not `genericOAuth`.
2. **`organizationId` = Brain `workspaceId`** without enabling BA organization plugin; provision membership ourselves in `provisionUser`.
3. **Domains unique host-wide** so HRD is unambiguous.
4. **Team workspaces only**; owner/admin configure.
5. **Direct SQLite upsert** into `ssoProvider` (dflow pattern) so Brain authz applies; still compatible with BA SSO runtime reads.
6. **Tear down** env OIDC immediately in this change.

## Risks

- BA organization provisioning APIs unused — custom `provisionUser` must stay correct.
- SAML callback path must match installed `@better-auth/sso` version.
