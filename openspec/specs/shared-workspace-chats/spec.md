## Purpose

Optional shared chat threads in team workspaces so members can see and continue the same conversation while personal chats stay private.

## Requirements

### Requirement: Team members can create shared chats
In a team workspace, a member MUST be able to create a chat with shared visibility. Personal workspaces MUST NOT allow shared chats.

#### Scenario: Shared chat created in team workspace
- **WHEN** a team workspace member creates a chat with shared visibility
- **THEN** the chat is stored as shared in that workspace

#### Scenario: Shared rejected on personal workspace
- **WHEN** a user in a personal workspace attempts to create a shared chat
- **THEN** the system rejects the request

### Requirement: Members can open shared chats
Any member of a team workspace MUST be able to list and open shared chats in that workspace. Personal chats MUST remain visible only to their owner.

#### Scenario: Teammate sees shared chat
- **WHEN** user A creates a shared chat in workspace W and user B is a member of W
- **THEN** user B’s sidebar lists that chat and can open its history

#### Scenario: Personal chat stays private
- **WHEN** user A creates a personal chat in workspace W and user B is a member of W
- **THEN** user B’s sidebar does not list that chat

### Requirement: Shared chat delete controls
The creator of a shared chat, or a workspace owner/admin, MUST be able to delete it. Other members MUST NOT delete a shared chat they did not create (unless they are owner/admin).

#### Scenario: Admin deletes shared chat
- **WHEN** a workspace admin deletes a shared chat created by another member
- **THEN** the chat is removed for all members
