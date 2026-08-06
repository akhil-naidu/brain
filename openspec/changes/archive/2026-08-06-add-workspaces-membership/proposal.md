## Why

Host Better Auth gives each person a login, but Brain still has no **workspace** tenancy: no invites for teammates, no shared playbooks/schedules per team, and no path to cloud/self-host/enterprise with the same model. Product decisions are locked in `docs/superpowers/specs/2026-08-06-brain-auth-tenancy-design.md`; this change is the **first implementation slice**.

## What Changes

- Add **workspaces** and **membership** (roles: owner, admin, member) on host SQLite.
- **Model B:** auto-create a Personal workspace for each user (when policy allows); support creating additional workspaces and switching the active workspace in session/UI.
- Map today’s host **operator** to **instance admin**; keep bootstrap `/setup` as first user + instance admin.
- Add **workspace invites** (owner/admin creates invite; accept joins workspace).
- Add **signup mode** instance policy: `open` | `invite-only` (default self-host: `invite-only`); when `open`, allow `/sign-up`. SSO-only and license UI are **out of this change**.
- **BREAKING (data model):** scope chats to `workspaceId + userId`; scope playbooks and schedules to `workspaceId`; scope MCP Connect grants to `workspaceId + userId + provider`. Migrate existing per-user rows into each user’s Personal workspace (or equivalent default).
- Keep MCP **platform/env + host credential setup** for this slice; **workspace BYOA** is a follow-up change.
- No Vercel Connect, Neon, AI Gateway, or `vercelOidc()`.

### Non-goals (this change)

- License key entitlements UI / signed license verification
- SSO / SAML / OIDC / SCIM
- Workspace BYOA OAuth apps
- Cloud multi-tenant managed DB
- Shared (workspace-visible) chat threads

## Capabilities

### New Capabilities

- `workspaces`: Workspace CRUD, membership roles, personal workspace provisioning, active workspace in session, workspace switcher UX constraints.
- `workspace-invites`: Invite create/accept/revoke for joining a workspace.
- `instance-policies`: Host-level signup mode and related toggles used by this slice (create-workspace allowed, auto personal workspace).

### Modified Capabilities

- `user-auth`: Bootstrap and session bind to workspaces; signup gated by instance signup mode; instance admin vs workspace roles.
- `chat-persistence`: Chat ownership keyed by workspace + user.
- `saved-playbooks`: Playbooks are workspace-scoped shared library.
- `scheduled-playbooks`: Schedules are workspace-scoped.
- `scheduled-morning-brief`: Morning brief config is workspace-scoped.
- `mcp-connections`: Connect grants keyed by workspace + user; app credentials remain host/platform for this slice.
- `connection-connect-menu`: Connect/disconnect operate in the active workspace context.
- `connection-status-menu`: Status reflects active workspace grants.
- `agent-runtime`: Eve principal / run context includes active workspace for data and MCP grant resolution.

## Impact

- Auth DB / chats DB schema and `lib/chat/user-data/*`, session helpers, bootstrap, setup/sign-in/sign-up UI.
- Playbook and schedule APIs and due-sweep run-as (workspace + member).
- MCP OAuth token paths and pending files (include workspace id).
- Chat shell: workspace switcher; no org terminology in UI.
- Design reference: `docs/superpowers/specs/2026-08-06-brain-auth-tenancy-design.md`.
