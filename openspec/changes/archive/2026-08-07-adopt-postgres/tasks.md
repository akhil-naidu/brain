## 1. Postgres foundation

- [x] 1.1 Add `pg` dependency and `lib/db/` helpers: resolve `BRAIN_DATABASE_URL` / `DATABASE_URL`, shared pool singleton, fail-fast when unset
- [x] 1.2 Add `docker-compose.yml` Postgres service and document local URL in `.env.example`
- [x] 1.3 Add Brain schema ensure/migrations for workspace, chat, playbook/schedule, bootstrap, and SSO helper tables (idempotent on empty DB)
- [x] 1.4 Unit tests for URL resolution and “no SQLite fallback” configuration behavior

## 2. Better Auth on Postgres

- [x] 2.1 Wire Better Auth `database` to the Postgres pool (installed Better Auth Postgres adapter)
- [x] 2.2 Run Better Auth migrations on `ensureAuthReady`; remove `node:sqlite` auth DB path usage
- [x] 2.3 Port bootstrap claim / instance policy / workspace store SQL from SQLite dialect to Postgres
- [x] 2.4 Port SSO provider + domain verification stores to Postgres
- [x] 2.5 Smoke: bootstrap, sign-in, session survive process restart against Compose Postgres

## 3. Chat and user-data stores

- [x] 3.1 Implement Postgres chat store (create/list/get/update/delete + events + revision) preserving API contracts
- [x] 3.2 Port playbooks / morning-brief / playbook-schedule user-data store to Postgres
- [x] 3.3 Remove SQLite chat/user-data modules and `BRAIN_*_DB_PATH` runtime paths
- [x] 3.4 Update store/API tests for Postgres (CI service or testcontainers)

## 4. Docs, CI, verify

- [x] 4.1 Update AGENTS.md / `.env.example` for required Postgres; note Compose for local dev
- [x] 4.2 Add CI Postgres service (or equivalent) so `pnpm run verify` exercises real SQL
- [x] 4.3 Update `openspec/config.yaml` context line that still says “host SQLite” for auth
- [x] 4.4 Run `pnpm run verify` and `pnpm run openspec:validate`
- [x] 4.5 On archive: sync delta specs into `openspec/specs/` and refresh chat-persistence Purpose wording
