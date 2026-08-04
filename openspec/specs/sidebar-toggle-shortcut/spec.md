# sidebar-toggle-shortcut Specification

## Purpose
Lets users show or hide the chat sidebar with a keyboard shortcut.
## Requirements
### Requirement: Sidebar toggle keyboard shortcut
The chat UI MUST toggle the sidebar open/closed when the user presses Command-B or Control-B, using the same visibility state as the sidebar buttons.

#### Scenario: Shortcut closes an open sidebar
- **WHEN** the sidebar is open and the user presses the toggle shortcut
- **THEN** the sidebar closes

#### Scenario: Shortcut opens a closed sidebar
- **WHEN** the sidebar is closed and the user presses the toggle shortcut
- **THEN** the sidebar opens

### Requirement: Shortcut discoverability
The open/close sidebar controls MUST expose the shortcut so users can discover it.

#### Scenario: Sidebar controls mention the shortcut
- **WHEN** the user inspects an open or close sidebar control
- **THEN** the shortcut is indicated

