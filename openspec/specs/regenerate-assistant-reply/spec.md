# regenerate-assistant-reply Specification

## Purpose
Lets users regenerate the latest assistant reply from the same user prompt without retyping.
## Requirements
### Requirement: Regenerate on the latest assistant message
When the chat is idle and the latest message is an assistant reply backed by a user prompt, the UI MUST offer a Regenerate control on that assistant message. Regenerate MUST NOT be offered while a turn is in progress or when send is blocked for setup.

#### Scenario: Regenerate appears on the latest assistant reply when idle
- **WHEN** the thread ends with an assistant message and the agent is not busy
- **THEN** that assistant message provides a Regenerate control

#### Scenario: Regenerate hidden while busy
- **WHEN** a turn is streaming or awaiting authorization
- **THEN** Regenerate is not available

### Requirement: Regenerated reply replaces the prior turn
Activating Regenerate MUST resend the latest user prompt through the same submit path as the composer and MUST replace the previous latest user turn and its assistant reply in the visible thread.

#### Scenario: Same prompt produces a replacement turn
- **WHEN** the user activates Regenerate on the latest assistant reply
- **THEN** the system sends the latest user prompt again
- **AND** the previous latest user message and assistant reply for that turn are no longer shown
