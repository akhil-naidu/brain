## 1. Schema and secret storage

- [x] 1.1 Add `brain_custom_model` table to `ensureBrainSchema` and bump `BRAIN_SCHEMA_REVISION`
- [x] 1.2 Implement API-key encrypt/decrypt helpers keyed from `BETTER_AUTH_SECRET` (AES-GCM) with tests
- [x] 1.3 Add a Postgres-backed custom-model store (CRUD by id, list instance, list by workspace) that never returns plaintext keys from public mappers

## 2. Catalog and model id resolution

- [x] 2.1 Introduce `custom:<uuid>` id helpers and stop collapsing unknown/custom ids in turn client context / extract paths
- [x] 2.2 Implement merged catalog builder: curated (when Command Code configured) + instance + active-workspace customs
- [x] 2.3 Add agent resolver: curated → Command Code; custom → OpenAI-compatible client from stored row + principal workspace check; fallback per design
- [x] 2.4 Wire `agent/agent.ts` `defineDynamic` model selection through the new resolver (including context window tokens)

## 3. APIs and authz

- [x] 3.1 `GET /api/models` merged catalog for active workspace (no secrets)
- [x] 3.2 `GET/POST /api/models/custom` list/create with `scope` gates (instance admin vs workspace owner/admin)
- [x] 3.3 `PATCH/DELETE /api/models/custom/[id]` update/delete with scope checks; blank key keeps previous
- [x] 3.4 Extend setup status with `customModelsAvailable` for the active workspace
- [x] 3.5 API/authz/redaction tests for instance vs workspace vs member

## 4. Models page UI

- [x] 4.1 Add `/models` page using `SettingsShell` (instance section, workspace section, read-only available list)
- [x] 4.2 Add create/edit dialog (label, base URL, provider model id, optional API key, context window, description) and delete confirm
- [x] 4.3 Link Models from app nav / settings entry points consistent with Tools
- [x] 4.4 Hide mutation controls for members; show instance controls only for instance admins

## 5. Chat picker and provider UX

- [x] 5.1 Load composer `ModelPicker` options from merged catalog API (not static curated-only list)
- [x] 5.2 Persist selected custom ids; fall back in UI when preferred id disappears from catalog
- [x] 5.3 Allow composer send when `commandCodeApiKeyConfigured || customModelsAvailable`; update empty-state copy accordingly
- [x] 5.4 Keep friendly auth-error rewriting without naming env vars

## 6. Verification

- [x] 6.1 Unit/integration tests for catalog merge, agent resolve, fallback, and setup-status gating
- [x] 6.2 Run `pnpm run verify` and fix regressions
