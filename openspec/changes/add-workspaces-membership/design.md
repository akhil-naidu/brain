## Context

See proposal.md — Why. Current state on `feat/multi-user-auth`: Better Auth users/sessions; chats, playbooks, schedules, and MCP grants keyed by `userId` only; host `operator` for credential setup; bootstrap creates first user with open signup off. Product model: `docs/superpowers/specs/2026-08-06-brain-auth-tenancy-design.md`.

## Goals / Non-Goals

**Goals:**

- Introduce `workspace` + `membership` tables (auth or chats DB — one clear home).
- Session carries active `workspaceId`; APIs enforce membership.
- Migrate existing per-user data into each user’s Personal workspace.
- Invites + signup-mode policy (`open` | `invite-only`).
- UI: workspace switcher; copy says “workspace” not “org”.

**Non-Goals:**

- License keys, SSO, workspace BYOA, shared chats, cloud Postgres (see proposal).

## Decisions

### 1. Store workspaces next to auth users
- **Choice:** Workspace, membership, invite, and instance_policy tables in the **auth SQLite** DB (same process as Better Auth users).
- **Why:** Membership is identity/tenancy; keeps FK-like joins to `user.id` simple.
- **Alternative:** Chats DB — rejected; splits identity across two files without benefit.

### 2. Active workspace on session
- **Choice:** Persist `activeWorkspaceId` on a small `brain_session_prefs` row keyed by session/user (or Better Auth session additional field if clean). Cookie/session must survive reload.
- **Why:** APIs need a stable active workspace without every client sending headers incorrectly.
- **Alternative:** Client-only localStorage — rejected for API security (server must not trust alone); may mirror for UX but server prefs win.

### 3. Data keying (ownership B)
- Chats / MCP grants: `(workspace_id, user_id, …)`
- Playbooks / schedules / morning brief: `(workspace_id, …)` only
- **Migration:** For each existing user, ensure Personal workspace + owner membership; rewrite `user_id`-only rows to that workspace id; MCP token files rename/rekey to include workspace.

### 4. Instance admin
- **Choice:** First bootstrap user flagged `instance_admin` (table or user flag). `BRAIN_OPERATOR_USER_ID` remains override for “who may edit host MCP app credentials” until BYOA ships; treat as instance-admin-equivalent for setup PUT/DELETE.
- **Why:** Minimal break with current operator checks.

### 5. Signup mode
- **Choice:** `instance_policy.signup_mode` default `invite-only`. When `open`, Better Auth sign-up allowed outside bootstrap gate. Invite accept may create user if missing (password set) even when invite-only.
- **Why:** Matches locked product defaults; self-host can flip to open.

### 6. Invites
- **Choice:** Opaque token, workspace id, optional email, role (default member), expiry; accept endpoint creates membership; workspace admin/owner only can create/revoke.
- **Why:** Standard; no email provider required for v1 (copy link).

### 7. MCP this slice
- **Choice:** Rekey grants to workspace+user; app credentials stay host/platform/env. Status/connect menus use active workspace.
- **Why:** BYOA deferred; avoids redirect-URI explosion this PR.

## Risks / Trade-offs

- **[Risk] Migration corrupts chats** → Backup `.eve/*.sqlite` note; migration transactional per user; tests with fixture DB.
- **[Risk] Schedule runs lack workspace** → Due-sweep / internal token must pass workspace id + run-as user; claim CAS includes workspace.
- **[Risk] MCP pending files race across workspaces** → Pending path includes workspaceId + userId.
- **[Trade-off] Instance policies minimal UI** → API + simple settings page enough; full admin console later.

## Migration Plan

1. Ship schema + ensurePersonalWorkspace on login/bootstrap.
2. One-shot migrate chats/playbooks/schedules/MCP keys into personal workspaces.
3. Enable invites + signup-mode; default invite-only.
4. Add workspace switcher; require active workspace on protected APIs.
5. Rollback: restore sqlite backups; feature flag optional if needed (`BRAIN_WORKSPACES=0` only if migration is gated — prefer forward-only with backup).

## Open Questions

_(none that block specs — BYOA/license/SSO deferred by proposal)_
