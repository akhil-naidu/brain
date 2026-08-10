# download-chat-markdown Specification

## Purpose
Lets users download a single chat message or the full conversation as a Markdown file for offline use and paste into other tools.

## Requirements

### Requirement: Download a message as Markdown
When a message has exportable content, the chat UI MUST offer a control to download that message as a `.md` file whose body is the same Markdown serialization used for copy.

#### Scenario: Download message file
- **WHEN** the user activates Download as Markdown on a message with exportable content
- **THEN** the browser downloads a `.md` file containing that message’s Markdown body

#### Scenario: No download when empty
- **WHEN** a message has no exportable content
- **THEN** Download as Markdown is not offered for that message

### Requirement: Download the thread as Markdown
When the current thread has at least one message, the chat UI MUST offer a control to download the full thread as a `.md` file using the same serialization as Copy chat (role-labeled sections; optional title heading).

#### Scenario: Download chat file
- **WHEN** the user activates Download chat on a non-empty thread
- **THEN** the browser downloads a `.md` file containing the serialized thread Markdown

#### Scenario: Control hidden or inert when empty
- **WHEN** the thread has no messages
- **THEN** the Download chat control is not available as an active download action

### Requirement: Sensible download filenames
Downloaded files MUST use a `.md` extension and a filename derived from the chat title when known, or a stable fallback when the title is missing.

#### Scenario: Titled chat download
- **WHEN** the user downloads a thread that has a non-empty title
- **THEN** the downloaded filename includes a sanitized form of that title and ends with `.md`
