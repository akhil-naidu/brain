## Why

Workspace membership APIs exist, but operators still cannot complete everyday auth flows in the browser: open signup, invite accept for new users, instance policy settings, and a real workspace switcher/create dialog. Without these surfaces, multi-user auth feels unfinished even when the data layer works.

## What Changes

- Add `/sign-up` when instance signup mode is `open`, with sign-in linking when allowed
- Add invite landing (`/invite/[token]`) for signed-in accept and invite-driven account creation when invite-only
- Add instance settings UI for instance admins (signup mode, create-workspace, auto personal)
- Replace `window.prompt` workspace UX with a switcher menu + create-workspace dialog; compact mode switches/creates properly
- Add workspace settings UI for owners/admins to create/copy/revoke invites
- Public signup-status API for auth pages (no session required)
- Invite register API that creates a user under the invite gate, accepts the invite, and establishes a session

Non-goals: license keys, SSO, workspace BYOA, email delivery (copy-link invites only), Vercel auth products.

## Capabilities

### New Capabilities

- `auth-workspace-ui`: Browser surfaces for signup, invite join, instance settings, workspace invites, and workspace switch/create
- `workspaces`: Workspace list/create/switch behavior exposed to signed-in users
- `workspace-invites`: Invite create/accept/register/revoke for workspace membership
- `instance-policies`: Host signup and workspace provisioning policies managed by instance admin

### Modified Capabilities

- `user-auth`: Open signup page when policy allows; invite-driven registration creates accounts under invite-only

## Impact

- `app/(auth)/` pages, new settings routes under `app/(app)/`
- `components/chat/workspace-switcher.tsx` and new settings/invite components
- New routes: `/api/auth/signup-status`, invite register endpoint
- Shell nav links to workspace/instance settings
- Tests for signup-status, invite register, and policy/UI API contracts
