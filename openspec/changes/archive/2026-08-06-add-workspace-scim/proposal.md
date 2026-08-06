## Why

Enterprise IdPs provision and deprovision users via SCIM. Brain has workspace SSO and invites, but no directory sync — IT must invite users manually. SCIM is the next deferred enterprise slice after domain verification.

## What Changes

- Add `@better-auth/scim` (SCIM 2.0 Users) without Better Auth `organization()` — same workspace-authority model as SSO
- Team workspace admins generate/rotate a workspace-bound SCIM bearer token from Workspace Settings
- IdP SCIM calls create/update/deactivate users; Brain adds/removes **workspace membership** from the token’s `providerId` mapping
- Gate on the existing SSO license entitlement (enterprise package); respect `maxUsers`
- Allow SCIM user creation under `invite-only` / `sso-only` (directory sync is the join path)
- Expose PUT/PATCH/DELETE on the Better Auth catch-all route for SCIM

## Non-goals

- Better Auth `organization()` plugin
- SCIM Groups → workspace roles
- Instance-wide (non-workspace) SCIM
- Shared workspace chats / cloud multi-tenant DB

## Capabilities

### New Capabilities

- `workspace-scim`: Workspace-scoped SCIM token management and membership sync

### Modified Capabilities

- `user-auth`: Auth route supports SCIM HTTP methods; SCIM may create users when signup would otherwise block
- `workspace-members`: SCIM provision/deprovision mutates membership

## Impact

- `lib/auth/server.ts`, `app/api/auth/[...all]/route.ts`
- `lib/auth/scim/*`, `app/api/workspaces/scim/`
- Workspace settings UI
- `@better-auth/scim` dependency
