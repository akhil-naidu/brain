# rename-chat Specification

## Purpose
Lets users rename a persisted chat from the sidebar so history labels stay meaningful.
## Requirements
### Requirement: Rename control for saved chats
For each persisted chat in the sidebar, the UI MUST provide a way to rename that chat. Draft/new chats that are not yet persisted MUST NOT require a rename action.

#### Scenario: User renames a saved chat
- **WHEN** the user renames a saved chat to a non-empty title
- **THEN** the sidebar shows the new title for that chat

#### Scenario: Active chat header reflects rename
- **WHEN** the user renames the currently open chat
- **THEN** the main chat header title matches the new title

### Requirement: Persist renamed title
Renaming a chat MUST persist the title through the chat update API so a later reload still shows the renamed title.

#### Scenario: Renamed title survives reload
- **WHEN** a chat is renamed and the chat list is loaded again
- **THEN** the chat summary includes the renamed title

#### Scenario: Empty title uses default
- **WHEN** the user submits a blank or whitespace-only title
- **THEN** the chat is stored with the default chat title

