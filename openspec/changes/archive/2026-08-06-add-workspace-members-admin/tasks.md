## 1. Store and APIs

- [x] 1.1 Add `listMembers`, `updateMemberRole`, `removeMember` with owner/admin/last-owner guards
- [x] 1.2 Add `GET/PATCH/DELETE /api/workspaces/members` (and `[userId]` as needed) scoped to active workspace
- [x] 1.3 Unit tests for promote/demote/remove/leave guards

## 2. UI

- [x] 2.1 Members section on `/settings/workspace` (list, role select for admins, remove/leave)
- [x] 2.2 Hide mutate controls for personal workspaces and non-admins (leave still when allowed)

## 3. Verify

- [x] 3.1 `pnpm run openspec:validate` and `pnpm run verify`
