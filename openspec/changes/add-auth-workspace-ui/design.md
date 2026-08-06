## Context

`add-workspaces-membership` shipped APIs + a minimal switcher (`<select>` + `window.prompt`). Default signup mode is `invite-only`, so localhost has no `/sign-up`, no invite landing, and no instance settings page — operators cannot add users or flip policy without curling APIs.

## Goals / Non-Goals

**Goals:**

- Ship browser UX for: open signup, invite join (existing + new users), instance policies, workspace create/switch, workspace invite management
- Keep invite-only secure (no public signup without invite or open policy)
- Match existing auth page styling and dialog patterns

**Non-Goals:**

- Email sending, SSO, license UI, BYOA, member removal/role edit beyond invites in this slice

## Decisions

### 1. Public signup-status endpoint
- **Choice:** `GET /api/auth/signup-status` returns `{ signupMode, openSignupAllowed, bootstrapAllowed }` without auth.
- **Why:** Sign-in/sign-up pages need to know whether to show Create account without requiring a session.

### 2. Invite register endpoint
- **Choice:** `POST /api/workspaces/invites/register` with `{ token, email, password }` — validates invite, `runWithInviteSignup` + Better Auth sign-up, accept invite, set active workspace, return Set-Cookie session via Better Auth.
- **Why:** Accept currently requires a session; brand-new invitees need one atomic path. ALS + invite gate already exists server-side.

### 3. Invite page under auth layout
- **Choice:** `/invite/[token]` in `(auth)` group — works logged out; if logged in, one-click accept.
- **Why:** Shareable link; no app shell until membership exists.

### 4. Settings routes in app shell
- **Choice:** `/settings/instance` (instance admin) and `/settings/workspace` (workspace admin/owner).
- **Why:** Keeps settings next to chat; shell can deep-link from sidebar/header.

### 5. Workspace switcher UX
- **Choice:** Dropdown/popover listing workspaces + “New workspace…” opening a Dialog (name field). Compact mode opens the same menu (not create-only).
- **Why:** `window.prompt` is not acceptable product UX; compact rail currently misfires create on click.

## Risks / Trade-offs

- **[Risk] Invite register races** → Reuse bootstrap-style serialization or rely on unique email + invite token single-use accept
- **[Trade-off] No email** → Admin copies invite URL; documented in UI

## Migration Plan

No DB migration. Fresh UI only. Existing invite tokens keep working.

## Open Questions

_(none)_
