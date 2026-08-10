## Why

Admins adding Ollama (or similar OpenAI-compatible local servers) must type the provider model id by hand. Ollama already exposes installed tags; Brain should fetch them so the Models form can pick an id instead of guessing.

## What Changes

- Add a same-origin **discover models** API that, given a base URL and optional API key, probes Ollama’s `/api/tags` and/or OpenAI-compatible `/models` and returns candidate model ids (no secrets echoed)
- On the Models page Add/Edit dialog, add a **Fetch models** control that fills a selectable list for the provider model id field
- Keep create/update as explicit save of one custom model row — discovery never auto-creates catalog entries
- Non-goals: Claude / Anthropic Messages providers; marketplace; background sync; changing tenancy; server-side export of installed models into Postgres without admin save

## Capabilities

### New Capabilities

- `custom-model-discovery`: Authenticated probe of a user-supplied OpenAI-compatible / Ollama base URL for installed model ids, with SSRF-aware fetch limits and admin-only access

### Modified Capabilities

- `custom-models`: Models management UI MAY offer discovery-assisted selection of provider model id when the admin supplies a reachable base URL

## Impact

- New API route under `/api/models/...`
- Models page dialog UX
- Unit tests for URL normalization / response parsing; no new Vercel infra
