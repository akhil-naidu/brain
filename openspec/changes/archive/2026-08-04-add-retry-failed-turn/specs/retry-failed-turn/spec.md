## Purpose

Lets users resend the last user prompt after a failed chat request or turn without retyping it.

## ADDED Requirements

### Requirement: Retry control on failed requests
When the chat UI shows a request-failed error and a retryable user prompt is available, the UI MUST provide a Retry control. Retry MUST NOT be offered when there is no retryable prompt, when a turn is already in progress, or when chat send is disabled for setup (for example, missing Command Code API key).

#### Scenario: Retry appears after a turn failure with a prior user message
- **WHEN** the agent reports a terminal turn/request failure and the thread has a prior user text message
- **THEN** the error UI includes a Retry control

#### Scenario: Retry hidden when there is nothing to resend
- **WHEN** a request fails but no retryable user prompt can be determined
- **THEN** the error UI does not offer Retry

### Requirement: Retry resends the last user prompt
Activating Retry MUST attempt to send the retryable user prompt again using the same client context path as a normal composer submit (selected model and enabled connections).

#### Scenario: Retry invokes send with the prior prompt
- **WHEN** the user activates Retry for a failed turn that has a retryable user prompt
- **THEN** the system sends that prompt text as a new turn

#### Scenario: Retry respects send gates
- **WHEN** chat send is blocked (busy turn or missing required API key)
- **THEN** Retry does not start a new send
