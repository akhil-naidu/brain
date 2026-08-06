## Why

Invites can bring people into a workspace, but owners and admins still cannot list members, change roles, or remove people from the UI/API. Without that, team workspaces cannot be administered day to day.

## What Changes

- List members of the active workspace (id, email/name when available, role)
- Workspace owner/admin can change member roles (`member` / `admin`; owner transfer out of scope)
- Workspace owner/admin can remove members (with last-owner and role safeguards)
- Members can leave a team workspace themselves (unless they are the last owner)
- Workspace settings UI section for members

Non-goals: ownership transfer UI, email notifications, SCIM, personal-workspace multi-member redesign, BYOA/SSO/license.

## Capabilities

### New Capabilities

- `workspace-members`: List, role-update, and remove membership for a workspace

### Modified Capabilities

_(none in main specs yet; workspaces/invites still live in unarchived changes)_

## Impact

- `lib/auth/workspaces/store.ts` membership helpers
- New `/api/workspaces/members` routes
- `/settings/workspace` members section
- Unit tests for role/remove guards
