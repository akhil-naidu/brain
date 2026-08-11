# assistant-message-more-menu Specification

## Purpose
Gives assistant replies an overflow menu for secondary actions and message metadata.

## Requirements

### Requirement: More menu on settled assistant replies
When an assistant message has finished streaming and has copyable content or a known timestamp, the UI MUST offer a More control that opens an overflow menu.

#### Scenario: More appears after an assistant reply settles
- **WHEN** an assistant message is idle and has exportable content or a timestamp
- **THEN** that message provides a More control

### Requirement: Timestamp and copy in the menu
The More menu MUST show a friendly timestamp when one is known for the message’s turn, and MUST offer Copy as Markdown when the message has exportable content. Additional export actions MAY appear in the same menu when their own capabilities allow them. Tool-specific create actions (for example Create ClickUp Doc) MUST NOT appear in the menu.

#### Scenario: Menu shows timestamp and copy
- **WHEN** the user opens More on an assistant reply with a known turn time and text
- **THEN** the menu shows a friendly timestamp
- **AND** offers Copy as Markdown that copies the message Markdown to the clipboard

### Requirement: Download as Markdown in More menu
When an assistant message is idle and has exportable content, the More menu MUST offer Download as Markdown. The menu MUST NOT offer connection-specific create actions for a single tool.

#### Scenario: More menu lists download
- **WHEN** the user opens More on a settled assistant reply with exportable content
- **THEN** the menu offers Download as Markdown

#### Scenario: More menu omits tool-specific create actions
- **WHEN** the user opens More on a settled assistant reply with exportable content
- **THEN** the menu does not offer Create ClickUp Doc or similar single-tool create actions
