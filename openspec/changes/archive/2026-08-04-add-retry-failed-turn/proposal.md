## Why

When a turn fails (provider error, network blip, missing key rewritten as an error), users currently see a toast and may get the last prompt back in the composer — but there is no one-click way to resend. Retrying should be obvious and cheap.

## What Changes

- Add a **Retry** control on the request-failed error toast when a retryable user prompt is available.
- Retry resends that prompt through the same send path as the composer (current model + connections context).
- Keep existing draft restore for failed user messages so users can still edit before sending.
- No regenerate/edit-in-place of server history; no automatic retries without a click.

## Capabilities

### New Capabilities

- `retry-failed-turn`: One-click resend of the last user prompt after a failed request/turn.

### Modified Capabilities

- (none)

## Impact

- `ErrorToast` UI (+ optional retry action)
- `EphemeralAgentChat` retry eligibility + handler
- Component/integration tests for retry visibility and send
- Non-goals: auth, persistence schema, Vercel infra, silent auto-retry loops
