## Context

See proposal.md — Why. Today `EphemeralAgentChat` shows `ErrorToast` for client/agent failures and, for a last user message with `metadata.status === "failed"`, restores that text into the draft. There is no explicit resend control. eve’s `useEveAgent` exposes `send` / `stop` / `reset` only — no regenerate API.

## Goals / Non-Goals

**Goals:**
- One-click Retry on the visible error toast when a prompt can be resent
- Reuse `handleSubmit` / `send` so length checks, persistence, and client context stay consistent
- Cover eligibility with a focused test

**Non-Goals:**
- Silent auto-retry / exponential backoff
- Server-side turn regeneration that rewrites history
- Retrying HITL authorization or tool input forms (separate flows)

## Decisions

1. **Placement** — Add optional `onRetry` to `ErrorToast` (primary action beside dismiss). Keeps the affordance next to the failure message users already see.
2. **Retryable text** —
   - Prefer last message when it is a user message with text (including `metadata.status === "failed"`).
   - Else, when `agent.status === "error"` (or a visible agent/client send error), use the most recent user text message in the thread.
3. **Action** — Call the existing submit path with that text (clear error via `prepareTurn`, then `send`). Do not invent a second send pipeline.
4. **Gates** — Hide/disable Retry when `missingApiKey`, `isBusy`, or no retryable text. Missing-key empty state stays as-is.
5. **Draft restore** — Keep the existing draft backfill for failed user messages so edit-then-send still works.

## Risks / Trade-offs

- [Duplicate user bubbles on retry after a confirmed `message.received`] → Accept for v1; eve has no regenerate. Mitigation: Retry label is “Retry”, not “Edit”.
- [Partial assistant output left above a new turn] → Accept; user can start a new chat if the thread is messy.
- [Client-only errors with no user message] → No Retry (dismiss only).
