## Purpose

Lets users jump to the sidebar chat search field with a keyboard shortcut.

## ADDED Requirements

### Requirement: Focus search keyboard shortcut
The chat UI MUST focus the sidebar chat search field when the user presses Command-K or Control-K. If the sidebar is closed, the UI MUST open it before focusing search.

#### Scenario: Shortcut focuses search
- **WHEN** the user presses the focus-search shortcut
- **THEN** the chat search field is focused

#### Scenario: Shortcut opens a closed sidebar
- **WHEN** the sidebar is closed and the user presses the focus-search shortcut
- **THEN** the sidebar opens and the search field is focused

### Requirement: Shortcut discoverability
The search control MUST expose the shortcut so users can discover it.

#### Scenario: Search control mentions the shortcut
- **WHEN** the user inspects the search chats control
- **THEN** the shortcut is indicated
