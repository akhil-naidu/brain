## ADDED Requirements

### Requirement: Download chat companion control
When the current thread has at least one message, the chat UI MUST provide a Download chat control alongside Copy chat that downloads the same serialized Markdown as a `.md` file.

#### Scenario: Download uses the same serialization as copy
- **WHEN** the user activates Download chat on a non-empty thread
- **THEN** the downloaded file body matches the Markdown that Copy chat would place on the clipboard for that thread
