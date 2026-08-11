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

### Requirement: Regenerated reply replaces the prior assistant output
Activating Regenerate MUST resend the latest user prompt through the same submit path as the composer. The visible thread MUST keep that user prompt on screen and MUST replace only the prior assistant reply for that turn (including empty failed/stopped placeholders). Earlier turns MUST remain visible.

#### Scenario: Same prompt produces a replacement assistant reply
- **WHEN** the user activates Regenerate on the latest assistant reply
- **THEN** the system sends the latest user prompt again
- **AND** that user prompt remains visible
- **AND** the previous assistant reply for that turn is no longer shown
- **AND** a resent duplicate of the user prompt MUST NOT appear as a second bubble
- **AND** the empty new-chat welcome MUST NOT appear while the replacement turn is pending

#### Scenario: Regenerate after an empty failed assistant reply
- **WHEN** the latest assistant message shows an empty failure placeholder such as "Couldn't generate a response"
- **AND** the user activates Regenerate
- **THEN** the user prompt remains visible
- **AND** the empty failure placeholder is removed while the replacement turn runs

#### Scenario: Regenerate keeps earlier turns
- **WHEN** the thread has earlier user/assistant turns before the latest pair
- **AND** the user activates Regenerate on the latest assistant reply
- **THEN** earlier turns remain visible
- **AND** only the latest assistant reply is replaced

#### Scenario: Failed regenerate restores the prior assistant reply
- **WHEN** Regenerate fails to send the replacement turn
- **THEN** the prior assistant reply (or empty placeholder) is shown again
- **AND** the user prompt remains visible

#### Scenario: Failed regenerate does not wipe persisted history
- **WHEN** Regenerate starts a replacement turn that fails before producing a new user message event
- **THEN** the original user prompt remains visible with its prior assistant placeholder
- **AND** persisted chat history MUST still include that user prompt after the turn settles
