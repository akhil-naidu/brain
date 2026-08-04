# copy-chat-markdown Specification

## Purpose
Lets users copy the current Brain chat thread to the clipboard as readable Markdown for use outside the app.
## Requirements
### Requirement: Markdown serialization of the visible thread
The system MUST serialize the current conversation’s user and assistant messages into Markdown. Text message MUST be labeled by role. Assistant tool calls MAY be summarized briefly; the export MUST include user and assistant text parts when present.

#### Scenario: User and assistant text are exported
- **WHEN** the thread contains a user message and an assistant text reply
- **THEN** the Markdown includes both roles with their text content

#### Scenario: Empty thread has no copyable content
- **WHEN** the thread has no messages
- **THEN** the system does not offer a successful copy of conversation content

### Requirement: Copy chat control
When the current thread has at least one message, the chat UI MUST provide a control to copy the thread as Markdown to the system clipboard.

#### Scenario: Copy places Markdown on the clipboard
- **WHEN** the user activates Copy chat on a non-empty thread
- **THEN** the clipboard receives the serialized Markdown for that thread

#### Scenario: Control hidden or inert when empty
- **WHEN** the thread has no messages
- **THEN** the Copy chat control is not available as an active copy action

