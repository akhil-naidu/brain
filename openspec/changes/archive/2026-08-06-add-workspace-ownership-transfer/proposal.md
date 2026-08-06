## Why

Team workspaces block the sole owner from leaving. Without ownership transfer, admins cannot take over and owners cannot hand off a workspace safely.

## What Changes

- Allow the current owner to transfer ownership to another existing member
- Former owner becomes admin after transfer
- Team workspaces only (not personal)
- Workspace settings UI control for owners

Non-goals: multi-owner workspaces, transferring to non-members, deleting workspaces, BYOA/SSO.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `workspace-members`: Add ownership transfer requirement

## Impact

- `lib/auth/workspaces/store.ts`
- `POST /api/workspaces/transfer` (or members transfer endpoint)
- `/settings/workspace` UI
- Unit tests
