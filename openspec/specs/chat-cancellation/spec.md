## Requirements

### Requirement: Stop waits for cancellation boundary

The chat UI MUST request cooperative cancellation via `session.cancel({ turnId })` and MUST NOT abort the local stream as a successful Stop. The composer MUST remain busy with a Stopping affordance until a terminal session boundary (`session.waiting`, `session.completed`, or `session.failed`) is observed.

#### Scenario: User stops a streaming reply

- **WHEN** the user activates Stop while a turn is streaming
- **THEN** the client requests cancel for that turnId and keeps the stream open until a terminal boundary arrives
- **AND** the local stream abort helper is not used to pretend the turn stopped

### Requirement: Navigation disposes the active turn

Before remounting the chat surface for New chat, select, or delete-of-active, the shell MUST dispose the current chat: cancel when streaming, then reset/detach. If cooperative cancel does not settle within a bounded navigation timeout, the UI MAY detach so navigation can proceed. Stop MUST NOT use that timeout path.

#### Scenario: New chat while streaming

- **WHEN** the user starts a new chat while a turn is streaming
- **THEN** the shell waits for dispose (cancel + boundary, or navigation timeout detach) before remounting a fresh chat
