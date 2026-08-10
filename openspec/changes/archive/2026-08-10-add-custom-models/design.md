## Context

Today `agent/agent.ts` builds a single Command Code `createOpenAI` client and `agent/lib/models.ts` allowlists curated ids. The picker persists a local `modelId`; turn client context and `resolveBrainChatModelId` reject anything outside that allowlist. Tenancy already has instance admin vs workspace owner/admin (same split as MCP host apps vs workspace BYOA). Schema lives in `lib/db/schema.ts` (`ensureBrainSchema`). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Durable instance + workspace custom models in Postgres
- `/models` management UI with correct authz
- Merged picker + agent resolution via OpenAI-compatible `baseURL`
- Custom-only hosts can chat without `COMMAND_CODE_API_KEY`

**Non-Goals:**
- Native Anthropic/Gemini SDKs
- Auto-discovering Ollama `/api/tags`
- Per-user model credential vaults
- Changing MCP credential storage

## Decisions

### 1. Selectable id namespace
- **Choice:** Curated ids stay as today (`deepseek/...`). Custom models use stable ids `custom:<uuid>` returned by the catalog API.
- **Why:** Avoids collisions with Command Code ids; easy branch in resolver.
- **Alternatives:** Reuse provider model id as picker id (collides across endpoints); separate `provider` field in client context (more moving parts).

### 2. Storage
- **Choice:** Table `brain_custom_model` with `id`, `scope` (`instance` | `workspace`), `workspace_id` (null for instance), `label`, `description`, `base_url`, `provider_model_id`, `context_window_tokens`, `api_key_ciphertext` (nullable), timestamps. Extend `ensureBrainSchema` / bump `BRAIN_SCHEMA_REVISION`.
- **Why:** Matches other Brain tenancy data; queryable for catalog merge; survives restarts without `.eve` files.
- **Alternatives:** `.eve` JSON files (weaker multi-instance); encrypt-at-rest only via disk volume.

### 3. API key handling
- **Choice:** Encrypt API keys at rest with a key derived from `BETTER_AUTH_SECRET` (AES-GCM). APIs return `hasApiKey: boolean` never plaintext. Empty key on update = keep existing.
- **Why:** Secrets in Postgres need more than plaintext columns; reuse existing host secret.
- **Alternatives:** Store keys only in `.eve` files keyed by model id; KMS (overkill for v1 self-host).

### 4. HTTP API shape
- **Choice:**
  - `GET /api/models` — merged catalog for active workspace (curated if Command Code configured + instance + workspace customs); no secrets
  - `GET/POST /api/models/custom` — list/create (body includes `scope`: `instance` | `workspace`)
  - `PATCH/DELETE /api/models/custom/[id]` — update/delete with scope checks
- **Why:** One catalog endpoint for the picker; mutations gated like Tools setup (instance admin vs workspace owner/admin).
- **Alternatives:** Separate `/api/instance/models` and `/api/workspaces/models` (more routes, clearer gates — acceptable fallback if implementation prefers).

### 5. Authz
- **Choice:** Instance scope mutations require `brain_instance_admin`. Workspace scope mutations require active-workspace role `owner` or `admin`. Any workspace member may `GET` the merged catalog for their active workspace.
- **Why:** Mirrors MCP credential management and workspace settings.

### 6. Agent resolution
- **Choice:** Client context continues to carry only `modelId` (now allowing `custom:<uuid>`). On `step.started`, resolve:
  1. curated id → existing Command Code client
  2. `custom:<uuid>` → load row from Postgres; allow if `scope=instance` or `scope=workspace` and `workspace_id` matches principal workspace (`workspaceIdFromIssuer`); build `createOpenAI({ baseURL, apiKey }).chat(provider_model_id)` with stored context window
  3. else fallback (Command Code default if key present, else first visible custom model if any)
- **Why:** Agent already shares the Next/`withEve` process and can use the same Postgres pool helpers; secrets never enter chat history.
- **Alternatives:** Internal HTTP resolve endpoint (extra hop); embed base URL in client context (leaks config; still must not embed API keys).

### 7. Stop rewriting unknown ids at the edge
- **Choice:** Split “resolve curated” from “normalize selection”. `createTurnClientContext` / extractors MUST pass through valid `custom:<uuid>` ids and only map unknown values to fallback at agent resolve time (or against the live merged catalog on the server when building context).
- **Why:** Today `resolveBrainChatModelId` collapses non-curated ids to the default, which would make custom selection impossible.

### 8. UI
- **Choice:** Dedicated `/models` page using `SettingsShell` (same family as `/tools`). Sections: Instance models (instance admin), Workspace models (owner/admin), Available models (everyone). Chat composer keeps `ModelPicker` but loads options from `GET /api/models`.
- **Why:** User asked for a separate page; matches Tools mental model.

### 9. Picker conflicts
- **Choice:** Distinct catalog entries always (`custom:<uuid>`); labels may duplicate. No override-by-name.
- **Why:** Simplest mental model; avoids silent shadowing.

### 10. Provider-setup status
- **Choice:** Extend setup status with `customModelsAvailable: boolean` for the active workspace. Composer enables send when `commandCodeApiKeyConfigured || customModelsAvailable`.
- **Why:** Spec’d in provider-setup-ux delta; unblocks Ollama-only hosts.

## Risks / Trade-offs

- **[Risk] Agent process lacks DB in some deploy shapes** → Mitigation: shared `getPool()` already required for auth/chat; document `BRAIN_DATABASE_URL` for eve/Next; add focused test that resolve fails closed to fallback if lookup errors.
- **[Risk] Weak encryption if `BETTER_AUTH_SECRET` rotates** → Mitigation: document that rotating the secret orphans stored model keys (admin re-pastes); acceptable for v1.
- **[Risk] SSRF via admin-entered base URL** → Mitigation: allowlist `http:`/`https:` only; block obviously dangerous hosts in server validation where practical; admins are trusted on self-host.
- **[Trade-off] OpenAI-compatible only** → Claude/native providers wait for a later change; keeps one code path.

## Migration Plan

1. Ship schema + APIs + `/models` UI behind normal deploy (empty table = no behavior change beyond catalog endpoint).
2. Point picker at merged catalog; keep curated default when Command Code configured.
3. No data migration from existing installs.
4. Rollback: remove UI/routes; unused table is harmless; curated path remains.

## Open Questions

_(none — Anthropic deferred; distinct entries chosen; scopes chosen)_
