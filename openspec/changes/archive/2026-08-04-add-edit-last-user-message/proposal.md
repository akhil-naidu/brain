## Why

Users often want to tweak the last ask and try again. Retry resends the same text; editing lets them fix the prompt without retyping from scratch.

## What Changes

- Add Edit on the latest user message when the chat is idle.
- Inline edit that message’s text, then resend through the normal submit path.
- Cancel returns to the original message text without sending.
- No server-side history rewrite (new turn is appended).

## Capabilities

### New Capabilities

- `edit-last-user-message`: Edit and resend the most recent user prompt.

### Modified Capabilities

- (none)

## Impact

- Message UI edit affordance
- Agent chat wiring to submit path
- Tests
- Non-goals: editing older messages, branching timelines, Vercel infra
