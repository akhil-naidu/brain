## Purpose

Lets users edit the most recent user prompt and resend it as a new turn.

## ADDED Requirements

### Requirement: Edit control on the latest user message
When the chat is idle and a latest user text message exists, the UI MUST offer an Edit control on that message. Edit MUST NOT be offered while a turn is in progress or when send is blocked for setup.

#### Scenario: Edit appears on the latest user message when idle
- **WHEN** the thread has a user text message and the agent is not busy
- **THEN** that latest user message provides an Edit control

#### Scenario: Edit hidden while busy
- **WHEN** a turn is streaming or awaiting authorization
- **THEN** Edit is not available

### Requirement: Resend edited prompt
Activating Edit MUST let the user change the prompt text and send it again through the same submit path as the composer.

#### Scenario: Edited text is sent
- **WHEN** the user edits the latest user prompt and confirms send
- **THEN** the system sends the edited text as a new turn

#### Scenario: Cancel keeps original text
- **WHEN** the user starts editing and cancels
- **THEN** no send occurs and the original message text remains displayed
