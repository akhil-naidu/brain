## 1. Pending OAuth per user

- [x] 1.1 Change pending storage to per-user files + state→userId index (keep reading legacy `mcp-oauth-pending-{name}.json` when principal/state matches)
- [x] 1.2 Update authorize start to write per-user pending; callback resolves pending by state without relying on a single shared file
- [x] 1.3 Scope disconnect `clearPending` to the signed-in user only

## 2. Operator-only setup writes

- [x] 2.1 Add `requireOperatorSession` (or equivalent) using `resolveOperatorUserId` / session user id
- [x] 2.2 Gate `PUT`/`DELETE` `/api/connections/[id]/setup` on operator; keep `GET` for any signed-in user
- [x] 2.3 Update integrations Set up UI: non-operators cannot save credentials; show operator-needed message when `needs_setup`

## 3. Verification

- [x] 3.1 Tests: concurrent pending isolation, disconnect does not clear other pending, non-operator setup rejected, operator setup ok
- [x] 3.2 `pnpm run verify`
