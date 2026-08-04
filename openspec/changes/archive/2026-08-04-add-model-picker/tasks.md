## 1. Model catalog + agent

- [x] 1.1 Add curated Command Code chat model catalog + helpers (`agent/lib/models.ts`)
- [x] 1.2 Parse selected model id from eve `Client context:` messages
- [x] 1.3 Wire `defineDynamic` `step.started` in `agent/agent.ts` with Command Code fallback
- [x] 1.4 Unit tests for catalog validation and message parsing

## 2. Client context + UI

- [x] 2.1 Shape turn clientContext as `{ modelId, connections }`
- [x] 2.2 Store selected model in chat shell context + localStorage
- [x] 2.3 Add composer model picker control
- [x] 2.4 Update agent chat sends to include selected model
- [x] 2.5 Tests for clientContext helper / shell preference

## 3. Verify

- [x] 3.1 Run `pnpm run verify` (or local bin chain) clean
