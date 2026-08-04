## Context

Brain uses Command Code via `@ai-sdk/openai` (`commandcode.chat(modelId)`). Eve’s `defineDynamic` allows runtime model selection, but session/turn scopes may only return serializable gateway model id strings. Command Code models are live `LanguageModel` objects, so selection must happen on `step.started`.

`clientContext` objects are not exposed on `DynamicResolveContext`; the eve channel converts them into user messages prefixed with `Client context:\n`. Resolvers read the latest such message from `ctx.messages`.

## Goals / Non-Goals

**Goals:**
- Small curated picker (DeepSeek Pro/Flash first)
- Persist preference in `localStorage`
- Wire selection through turn `clientContext` + `defineDynamic`
- Keep connection enablement context working

**Non-Goals:**
- Full live Command Code `/models` catalog fetch
- Anthropic `/messages` models (Claude) — wrong endpoint for current provider wiring
- Per-chat model persistence in SQLite (browser preference is enough for v1)

## Decisions

1. **Catalog in `agent/lib/models.ts`** — shared by agent (`#lib/models`) and UI (`@/agent/lib/models`).
2. **`step.started` dynamic model** — return `{ model: commandcode.chat(id), modelContextWindowTokens }`.
3. **Object clientContext** — `{ modelId, connections }` replacing bare connection string.
4. **localStorage key** — e.g. `brain.selectedModelId`; invalid stored values reset to default.
5. **UI** — compact select beside connections menu in composer footer.

## Risks / Trade-offs

- Mid-session model switches break prompt caches (acceptable for personal Brain).
- Curated list can drift from Command Code’s live catalog — document and keep short.
