## Purpose

Provides Brain's browser chat experience: ephemeral sessions, streaming messages, composer controls, and template-like shell chrome without login or durable storage.

## ADDED Requirements

### Requirement: Same-origin ephemeral chat session
The system MUST let a browser client open an eve session on the app origin and exchange turns without requiring a user login gate. Conversation state MUST be ephemeral to the browser session (refresh clears messages). The system MUST NOT persist chat history to a database for v1.

#### Scenario: Chat without login
- **WHEN** a user opens the chat UI with no auth cookies or OAuth login completed
- **THEN** they can send a message and receive a streamed assistant reply

#### Scenario: Refresh clears history
- **WHEN** the user refreshes the page after a conversation
- **THEN** prior messages are not restored from durable storage

### Requirement: Streaming message and tool rendering
The chat UI MUST render user and assistant messages, including streamed assistant text, and MUST surface tool/HITL/authorization-related message parts needed to continue a turn in the browser.

#### Scenario: Assistant text streams
- **WHEN** the agent produces assistant text for a turn
- **THEN** the UI updates with streamed text without requiring the eve terminal

#### Scenario: Errors are visible
- **WHEN** `useEveAgent` reports an error status
- **THEN** the UI shows an error message to the user

### Requirement: Composer send and stop
The UI MUST provide a composer to submit text turns and stop the client-side in-flight stream while a turn is busy.

#### Scenario: Send message
- **WHEN** the user submits non-empty composer text while idle
- **THEN** the system sends a turn to the eve session

#### Scenario: Stop stream
- **WHEN** the user activates stop during streaming
- **THEN** the client aborts its in-flight stream subscription

### Requirement: New chat resets the session
The UI MUST provide a New chat action that clears the local conversation and resets the eve client session cursor so the next send starts fresh.

#### Scenario: New chat clears thread
- **WHEN** the user chooses New chat after an existing conversation
- **THEN** the message list is empty and subsequent sends do not continue the previous local thread state

### Requirement: Sidebar chrome without durable history API
The UI MUST show sidebar chrome consistent with a chat template layout. It MUST NOT expose chat history APIs backed by a database for v1.

#### Scenario: No chats API required
- **WHEN** the chat shell loads
- **THEN** it does not require `/api/chats` or Neon-backed history to render
