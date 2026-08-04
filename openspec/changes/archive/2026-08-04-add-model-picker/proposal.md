## Why

Brain hardcodes one Command Code model (`deepseek/deepseek-v4-pro`). Users need a simple way to pick a faster/cheaper model (e.g. Flash) vs a stronger one without editing `agent.ts` or env.

## What Changes

- Curated allowlist of OpenAI-compatible Command Code chat models in the UI.
- Composer model picker; preference remembered in `localStorage`.
- Each turn sends the selected model id via structured `clientContext`.
- Agent uses `defineDynamic` on `step.started` to resolve a Command Code `LanguageModel` (required: live SDK models cannot be serialized on session/turn scopes).
- Keep connection guidance in the same `clientContext` object.
- No Vercel AI Gateway; no Anthropic `/messages`-only models in v1 (chat-completions path only).

## Capabilities

### New Capabilities

- `model-picker`: Browser model selection for Command Code chat models, applied on the next turn.

### Modified Capabilities

- (none in main specs yet)

## Impact

- `agent/agent.ts`, `agent/lib/models.ts`
- Chat shell context, composer footer, clientContext helpers
- Tests for catalog parsing and clientContext shaping
