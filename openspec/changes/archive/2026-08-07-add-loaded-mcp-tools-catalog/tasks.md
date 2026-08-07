## 1. Spike eve inspection shape

- [x] 1.1 Call local `GET /eve/v1/info` (or equivalent) under Brain’s eve channel auth and document where MCP connection tools appear (name, description, connection id)
- [x] 1.2 Decide mapper rules: filter to Brain `CONNECTION_ITEMS` ids that are `connected` for the active workspace session

## 2. Catalog API

- [x] 2.1 Add session-gated `GET` API (e.g. `/api/connections/tools`) that requires Better Auth + active workspace
- [x] 2.2 Server-side fetch eve inspection with the signed-in user’s principal; map to `{ connectionId, connectionName, tools: [{ name, description }] }`
- [x] 2.3 Return clear errors when eve is unreachable; do not return a fake empty success
- [x] 2.4 Reject unauthenticated requests; enforce workspace isolation (no cross-workspace grants)
- [x] 2.5 Add tests for auth rejection, empty connected set, and connected connection tool rows

## 3. Tools page UI

- [x] 3.1 Add client fetch helper for the catalog API
- [x] 3.2 Add “Loaded tools” section on `/tools` (MCP tab): group by connection, show name + description
- [x] 3.3 Loading, empty (no connected apps), and error + retry states
- [x] 3.4 Refetch on focus and after successful Connect/Disconnect from the same page
- [x] 3.5 Confirm in-chat tool call rendering is unchanged

## 4. Docs and verify

- [x] 4.1 Note the catalog on `/tools` in README (brief)
- [x] 4.2 Run `pnpm run verify` with Postgres available
- [x] 4.3 `pnpm run openspec:validate` for this change
