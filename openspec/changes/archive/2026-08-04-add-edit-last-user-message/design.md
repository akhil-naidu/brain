## Context

See proposal.md — Why. eve `send` has no regenerate/edit-history API. Retry already resends unchanged text via `handleSubmit`.

## Goals / Non-Goals

**Goals:**
- Inline edit on the latest user message
- Resend via existing submit/send path
- Cancel without side effects

**Non-Goals:**
- Editing arbitrary older messages
- Removing prior assistant output from the thread
- Branching / forked timelines

## Decisions

1. **Target** — Most recent `role === "user"` message with text (may not be the last bubble if an assistant reply follows).
2. **UI** — Hover Edit on that bubble; replace text with textarea + Cancel / Send.
3. **Send** — Call existing `handleSubmit(editedText)`.
4. **Gates** — Same as Retry: not busy, not missing API key.

## Risks / Trade-offs

- [Duplicate user/assistant turns after edit] → Accept; no history rewrite API.
