## Context

`removeMember` / role updates reject changing or removing the last owner. Operators need a dedicated transfer path.

## Decisions

### 1. Transfer API
- **Choice:** `POST /api/workspaces/transfer` with `{ userId }` for the new owner (active workspace).
- **Why:** Distinct from role PATCH which forbids assigning `owner`.

### 2. Role after transfer
- **Choice:** Target becomes `owner`; actor becomes `admin`.
- **Why:** Keeps former owner as elevated member; they can leave afterward if desired.

### 3. Eligibility
- **Choice:** Actor must be current owner; target must already be a member of the team workspace; personal workspaces rejected.
- **Why:** No invite-during-transfer; keeps roster consistent.

## Open Questions

_(none)_
