## Context

Host apps live in `.eve/mcp-app-credentials-{name}.json` (or env). Grants are already `workspaceId + userId`. BYOA is the missing app layer.

## Decisions

### 1. Storage
- **Choice:** `.eve/workspaces/{workspaceId}/mcp-app-credentials-{name}.json` (same schema as host).
- **Why:** Matches host file pattern; no new DB encryption work this slice.

### 2. Resolve order
- **Choice:** workspace BYOA → host stored → env → DCR.
- **Why:** Matches tenancy design; existing grants keep embedded client on token for refresh.

### 3. API
- **Choice:** `/api/workspaces/connections/[id]/setup` GET/PUT/DELETE for active workspace; host `/api/connections/[id]/setup` unchanged for instance admin.
- **Why:** Clear gate separation (workspace admin vs instance admin).

### 4. UI
- **Choice:** BYOA forms on `/settings/workspace` for static providers; Connect menu still uses resolve automatically.
- **Why:** Admins configure apps where they already manage membership.

## Open Questions

_(none)_
