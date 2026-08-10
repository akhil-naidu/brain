## Why

Brain’s chat model picker is limited to a curated Command Code catalog. Self-host operators and workspace admins need to plug in their own OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, company OpenAI proxies, etc.) without redeploying, and share those models at the right tenancy scope.

## What Changes

- Add a dedicated **Models** page (`/models`) for managing custom chat models
- Let **instance admins** create/update/delete **instance-scoped** custom models visible in every workspace’s picker
- Let **workspace owners/admins** create/update/delete **workspace-scoped** custom models visible only in that workspace
- Merge curated Command Code models + instance models + active-workspace models into the chat model picker
- Persist custom model definitions (label, OpenAI-compatible base URL, optional API key, provider model id, context window) in Postgres; never return stored API keys to the client
- Resolve the selected model at turn time to the correct OpenAI-compatible provider (`@ai-sdk/openai` + custom `baseURL`), keeping Command Code as the default path
- When at least one usable custom model exists for the active workspace, chat MUST NOT require `COMMAND_CODE_API_KEY` solely to send turns that use that custom model

Non-goals: native Anthropic Messages / Claude provider wiring, Google Gemini direct SDK, per-user private model credentials, Vercel AI Gateway, license gates on custom models, model marketplace / auto-discovery of Ollama tags beyond what the admin enters.

## Capabilities

### New Capabilities

- `custom-models`: CRUD, tenancy scopes (instance vs workspace), Models page authz, secret handling, and agent resolution for OpenAI-compatible custom models

### Modified Capabilities

- `model-picker`: Catalog and selection include custom models (instance + active workspace) alongside the curated Command Code list; unknown/removed custom ids fall back safely
- `provider-setup-ux`: Chat availability accounts for custom models so hosts that only use BYO endpoints are not blocked on Command Code setup

## Impact

- New `/models` UI (settings-shell pattern like `/tools`)
- New APIs for listing/creating/updating/deleting custom models (instance + workspace scopes)
- Postgres tables for custom model records + encrypted/secret storage for API keys
- `agent/lib/models.ts`, `agent/agent.ts` dynamic model resolution beyond Command Code-only
- Composer model picker + turn client context ids for custom models
- Tests for authz, catalog merge, secret redaction, and agent model resolution
- No Vercel infrastructure; stay on `@ai-sdk/openai` + self-hosted Postgres
