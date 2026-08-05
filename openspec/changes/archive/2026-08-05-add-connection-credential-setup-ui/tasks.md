## 1. Credential store

- [x] 1.1 Add `.eve` app-credential read/write/delete with restrictive permissions
- [x] 1.2 Resolve credentials stored-first, then env; update status/authorize/mcp-oauth

## 2. Setup API + UI

- [x] 2.1 Add GET/PUT/DELETE `/api/connections/[id]/setup` (no secrets in responses)
- [x] 2.2 Add Configure dialog + integrations-menu wiring for `needs_setup`
- [x] 2.3 Document UI Configure as preferred path in `.env.example`

## 3. Verification

- [x] 3.1 Unit tests for credential store, status, and Configure offer helper
- [x] 3.2 `pnpm run verify`
- [x] 3.3 Sync OpenSpec main specs and archive change
