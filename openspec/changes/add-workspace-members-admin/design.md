## Context

Membership rows exist (`brain_workspace_member`). Invites add members. No list/update/remove API or UI yet.

## Goals / Non-Goals

**Goals:** Safe member roster + role/remove controls for team workspace admins; self-leave for non-last-owner members.

**Non-Goals:** Transfer ownership, billing, SCIM, deleting user accounts.

## Decisions

### 1. Who can list
- **Choice:** Any workspace member can list members of that workspace.
- **Why:** Transparency for collaborators; no secret roster.

### 2. Role changes
- **Choice:** Owner or admin may set roles to `member` or `admin` only. Cannot assign `owner` via this API. Admins cannot change an owner’s role. Cannot demote the last remaining owner.
- **Why:** Avoids accidental orphan workspaces; ownership transfer is a separate feature.

### 3. Removals
- **Choice:** Owner may remove admin/member; admin may remove member only (not owner/admin). Target may remove themselves (leave) unless they are the sole owner. Clearing active workspace for removed user falls back via existing resolve logic.
- **Why:** Matches common admin/member hierarchy.

### 4. Personal workspaces
- **Choice:** List still works; mutating members on `kind=personal` is rejected (except no-op). Invites already odd on personal — keep mutations team-only for remove/role.
- **Why:** Personal is single-owner Model B default.

### 5. Email display
- **Choice:** LEFT JOIN Better Auth `user` table for email/name when present.
- **Why:** Same auth DB; no extra store.

## Risks / Trade-offs

- **[Risk] Last owner removed** → Guard counts owners before demote/remove
- **[Trade-off] No owner transfer** → Document; add later if needed

## Open Questions

_(none)_
