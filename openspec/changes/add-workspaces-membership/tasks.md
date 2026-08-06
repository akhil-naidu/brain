## 1. Schema and policies

- [x] 1.1 Add auth-DB tables for workspace, membership, invite, instance_policy, session active workspace prefs, and instance_admin flag/mapping
- [x] 1.2 Seed default instance policies (signup_mode=`invite-only`, auto personal workspace on, allow create workspace on)
- [x] 1.3 On bootstrap first user: set instance admin, ensure Personal workspace + owner membership, set active workspace
- [x] 1.4 Ensure Personal workspace (and active workspace) on login/session when policy requires it

## 2. Workspace APIs and session

- [x] 2.1 Implement list/create/switch workspace APIs with membership checks and create-workspace policy
- [x] 2.2 Persist and resolve active `workspaceId` for authenticated requests
- [x] 2.3 Map host operator checks to instance admin for MCP host credential setup
- [x] 2.4 Add workspace switcher UI; use “workspace” copy only

## 3. Data migration and scoping

- [x] 3.1 Migrate existing chats to `(workspace_id, user_id)` under each user’s Personal workspace
- [x] 3.2 Migrate playbooks and schedules/morning-brief to workspace scope; set run-as user to former owner
- [x] 3.3 Rekey MCP OAuth grants and pending files to include workspace id; update status/connect/disconnect/authorize paths
- [x] 3.4 Update chat/playbook/schedule HTTP APIs to require active workspace membership and enforce ownership B

## 4. Invites and signup mode

- [x] 4.1 Implement invite create/list/revoke/accept APIs (admin/owner only for mutate)
- [x] 4.2 Invite accept joins workspace; optional email bind; keep Personal membership
- [x] 4.3 Gate Better Auth public sign-up on signup_mode=`open`; keep bootstrap and invite-driven account creation for invite-only
- [x] 4.4 Instance-admin API (and minimal UI) to read/update signup mode and related policies

## 5. Agent and schedules runtime

- [x] 5.1 Eve channel / session principal resolution includes active workspace for MCP grant lookup
- [x] 5.2 Due-sweep and forced schedule runs pass workspace id + run-as user; CAS claims remain safe
- [x] 5.3 Internal operator token paths remain workspace-aware where they create chats

## 6. Tests and verify

- [x] 6.1 Unit/integration tests for membership isolation, invite accept/revoke, signup modes, and migration helpers
- [x] 6.2 Tests for MCP grant isolation across users and workspaces
- [x] 6.3 Run `pnpm run openspec:validate` and `pnpm run verify`
