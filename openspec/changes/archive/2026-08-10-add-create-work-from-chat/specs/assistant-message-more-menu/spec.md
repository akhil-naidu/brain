## ADDED Requirements

### Requirement: Download and Create ClickUp Doc in More menu
When an assistant message is idle and has exportable content, the More menu MUST offer Download as Markdown. When ClickUp create-doc is available for the session, the More menu MUST also offer Create ClickUp Doc.

#### Scenario: More menu lists download
- **WHEN** the user opens More on a settled assistant reply with exportable content
- **THEN** the menu offers Download as Markdown

#### Scenario: More menu lists create ClickUp Doc when available
- **WHEN** the user opens More on a settled assistant reply with exportable content
- **AND** ClickUp create-doc is available for the session
- **THEN** the menu offers Create ClickUp Doc

## MODIFIED Requirements

### Requirement: Timestamp and copy in the menu
The More menu MUST show a friendly timestamp when one is known for the message’s turn, and MUST offer Copy as Markdown when the message has exportable content. Additional create/export actions MAY appear in the same menu when their own capabilities allow them.

#### Scenario: Menu shows timestamp and copy
- **WHEN** the user opens More on an assistant reply with a known turn time and text
- **THEN** the menu shows a friendly timestamp
- **AND** offers Copy as Markdown that copies the message Markdown to the clipboard
