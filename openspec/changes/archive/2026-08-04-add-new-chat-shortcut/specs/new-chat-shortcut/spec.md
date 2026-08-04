## Purpose

Lets users start a new chat with a keyboard shortcut.

## ADDED Requirements

### Requirement: New chat keyboard shortcut
The chat UI MUST start a new chat when the user presses Command-Shift-O on macOS-style modifiers or Control-Shift-O otherwise, using the same behavior as the New chat control.

#### Scenario: Shortcut starts a new chat
- **WHEN** the user presses the new-chat shortcut while the chat UI is open
- **THEN** the UI starts a new chat through the same path as New chat

#### Scenario: Unrelated shortcuts are ignored
- **WHEN** the user presses a different key combination
- **THEN** the chat UI does not start a new chat from that event

### Requirement: Shortcut discoverability
The New chat control MUST expose the shortcut so users can discover it (for example via title/tooltip text).

#### Scenario: New chat control mentions the shortcut
- **WHEN** the user inspects the New chat control
- **THEN** the shortcut is indicated
