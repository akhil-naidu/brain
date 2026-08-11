## Why

Brain already supports Ask vs Agent, but the composer mode control looks the same for every mode and lacks Cursor-like Plan/Debug workflows. Users need a clear visual cue when switching modes and distinct tool/instruction policies for planning and evidence-first debugging.

## What Changes

- Expand chat modes from `ask | agent` to `ask | agent | plan | debug`.
- Color the mode picker, composer border, and send button by active mode (Ask green, Agent neutral, Plan amber, Debug red/orange).
- Add Plan and Debug dynamic instructions plus tool gating: Ask blocks all harness tools; Plan allows research/read tools but blocks mutating shell/write; Agent and Debug allow full tools with mode-specific guidance.
- Persist the selected mode in existing `brain.chatMode` localStorage and pass it through turn client context.
- Non-goals: no Vercel infra, no auth/persistence changes, no Cursor Design Mode, no editable virtual plan document / Build button workflow in this change (Plan is instruction + tool policy + UI; user switches to Agent to implement).

## Capabilities

### New Capabilities

- `chat-agent-modes`: Chat mode catalog, persistence, turn context, colored composer chrome, and per-mode agent instructions/tool gating.

### Modified Capabilities

- (none — Ask/Agent behavior today is implementation-only; no existing OpenSpec capability owned modes)

## Impact

- `lib/chat/chat-mode.ts`, `lib/chat/turn-client-context.ts`
- `agent/lib/client-context-model.ts`, `agent/lib/gate-harness-tool.ts`, `agent/instructions/*`, mutating vs read harness tools
- `components/chat/chat-mode-picker.tsx`, `components/chat/composer.tsx`, `app/_components/ephemeral-agent-chat.tsx`, `app/globals.css`
- Tests for mode resolution, turn context, gating helpers, and mode picker accents
