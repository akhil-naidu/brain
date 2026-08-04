# copy-message Specification

## Purpose
Lets users copy a single chat message to the clipboard as Markdown.
## Requirements
### Requirement: Per-message copy control
When a message has exportable content, the chat UI MUST provide a control to copy that message to the clipboard.

#### Scenario: Copy a user or assistant message
- **WHEN** the user activates Copy on a message with text (or other exportable parts)
- **THEN** the clipboard receives that message’s Markdown content

#### Scenario: No copy when empty
- **WHEN** a message has no exportable content
- **THEN** Copy is not offered for that message

### Requirement: Brief copy feedback
After a successful copy, the UI MUST briefly indicate success. If clipboard access fails, the UI MUST indicate failure.

#### Scenario: Successful copy shows confirmation
- **WHEN** copy succeeds
- **THEN** the control briefly shows a copied state

