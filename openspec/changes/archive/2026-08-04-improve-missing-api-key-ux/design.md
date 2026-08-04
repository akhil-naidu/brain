## Context

Brain uses Command Code via `COMMAND_CODE_API_KEY`. Local `.env` is often empty during early setup, and eve/provider failures are hard to decode.

## Goals / Non-Goals

**Goals:**
- Proactive banner/empty-state when key missing
- Composer disabled with clear reason
- Rewrite auth-like turn errors to the same guidance
- Never leak the key value over HTTP

**Non-Goals:**
- Validating the key against Command Code’s API
- Multi-provider credential UX
- Login / secrets management UI

## Decisions

1. **`GET /api/setup`** returns `{ commandCodeApiKeyConfigured: boolean }` from env presence.
2. **Shared copy** in `lib/chat/provider-setup.ts` for banner, disabled reason, and error rewrite.
3. **Fetch once** on chat mount; no polling.
4. **Heuristic rewrite** for messages matching API key / unauthorized / 401 patterns.

## Risks / Trade-offs

- Heuristic may rewrite unrelated 401s — acceptable for local single-tenant Brain.
- Env changes require restart of `pnpm dev` — mention restart in the copy.
