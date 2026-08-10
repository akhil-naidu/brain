## Context

Custom models already store `baseUrl` + `providerModelId`. Ollama’s native `GET /api/tags` and OpenAI-compatible `GET /v1/models` can list installed ids. Admins currently type ids manually on `/models`.

## Goals / Non-Goals

**Goals:**
- Server-side discover endpoint for admins
- Models dialog “Fetch models” → pick id
- Safe-enough fetch for self-hosted Brain (timeouts, size limits, authz)

**Non-Goals:**
- Anthropic/Claude native SDK
- Auto-creating a custom model per discovered tag
- Continuous sync / watchers

## Decisions

1. **Server-side probe (not browser-direct)**  
   Browser → Brain API → target host. Avoids mixed-content and keeps optional API key off client logs for the probe path (key still typed in the form).  
   **Alt:** browser fetch to localhost — rejected for remote Ollama and CORS.

2. **Probe order**  
   Normalize base URL; if path ends with `/v1`, also try `{origin}/api/tags` (Ollama). Always try `{baseUrl}/models` (OpenAI list) with optional Bearer. Merge unique ids.

3. **SSRF posture for self-host**  
   Allow private IPs (required for local Ollama). Enforce: short timeout (~4s), max response bytes, no redirect chains beyond 1, http/https only, admin-only. Document that operators should not expose Brain to untrusted admins who could scan the LAN.

4. **UI**  
   “Fetch models” beside Model id; show a compact list/select of candidates; selecting writes `providerModelId` (and may prefill label if empty).

## Risks / Trade-offs

- **[SSRF / LAN scan]** → Authz + timeouts; accept residual risk for trusted admins on self-host.  
- **[Wrong path for non-Ollama]** → OpenAI `/models` fallback; manual entry remains.  
- **[Large tag lists]** → Cap returned ids (e.g. 200).

## Migration Plan

Additive API + UI. No schema change.
