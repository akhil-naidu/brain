## Context

See proposal.md — Why. Empty state lives in `EphemeralAgentChat` with Brain mark + optional missing-key copy.

## Goals / Non-Goals

**Goals:**
- 3–4 Brain-relevant starters (ClickUp / Slack / Gmail / general)
- Click → existing `handleSubmit`
- Clean stacked list (not a dense pill strip)

**Non-Goals:**
- Dynamic/personalized prompts
- Localizing prompts in this change

## Decisions

1. **Copy** — static list in `lib/chat/welcome-prompts.ts`.
2. **UI** — `WelcomePrompts` component: vertical text buttons under the empty-state subtitle.
3. **Visibility** — only when `messages.length === 0` and `missingApiKey` is false.
4. **Action** — `onSelect(prompt)` → `handleSubmit(prompt)`.

## Risks / Trade-offs

- [Prompts assume connected apps] → Keep wording soft (“help me…”) so they still work without OAuth.
