## Context

`@better-auth/scim` org-scoped tokens require the Better Auth `organization()` plugin. Brain workspaces are authoritative (SSO already stores `organizationId = workspaceId` on SSO providers without that plugin). SCIM org-scoped create/delete paths hard-require the org plugin, so Brain uses **personal SCIM connections** (no BA `organizationId`) keyed by a deterministic `providerId` per workspace.

## Goals / Non-Goals

**Goals:** SCIM 2.0 Users for team workspaces; admin token UI; membership sync; license + maxUsers gates.

**Non-Goals:** BA organization plugin; Groups; role mapping from IdP.

## Decisions

1. **Package:** `@better-auth/scim` aligned with `better-auth` ^1.6.26.
2. **providerId:** `brain-scim-{workspaceId}` — unique host-wide; no BA `organizationId` on the SCIM connection.
3. **AuthZ for tokens:** `canGenerateToken` / `beforeSCIMTokenGenerated` verify Brain workspace owner/admin for that workspace id. Public BA generate-token is otherwise denied for unrelated provider ids.
4. **Membership sync:** `databaseHooks.account.create.after` → `addMember(workspaceId, userId, "member")`. On SCIM delete/account remove → `removeMember` when safe (not last owner).
5. **Signup modes:** Auth route wraps `/scim/` requests in an ALS gate so `user.create.before` allows SCIM JIT under invite-only/sso-only while still enforcing maxUsers + SSO license.
6. **License:** Reuse entitlements.`sso` (no new license field). Unlicensed hosts keep SSO unlocked, so SCIM works in local/dev the same way.
7. **HTTP:** Export PUT/PATCH/DELETE from `app/api/auth/[...all]/route.ts` via `toNextJsHandler`.

## Risks

- **[Risk] Deleting a multi-account user** — SCIM DELETE may only drop the SCIM account; Brain still removes workspace membership for that provider mapping.
- **[Risk] Token leakage** — Show plaintext token once; store hashed if plugin supports (`storeSCIMToken: "hashed"`).
