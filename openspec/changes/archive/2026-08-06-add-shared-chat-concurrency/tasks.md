## 1. Store + API

- [x] 1.1 Schema: revision + turn lock columns; CAS update + lock helpers
- [x] 1.2 PATCH chat API: expectedRevision + turnLock; 409 conflicts
- [x] 1.3 Unit tests for CAS and turn lock

## 2. Client

- [x] 2.1 Track revision; acquire/release lock on shared turns; surface conflicts

## 3. Verify

- [x] 3.1 `pnpm run verify`
