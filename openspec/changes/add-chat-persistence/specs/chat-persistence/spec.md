## Purpose

Local durable chat history for Brain: create, list, open, delete, and resume conversations after refresh using host-local storage, without login or cloud databases.

## ADDED Requirements

### Requirement: Durable chat records on the host
The system MUST persist each conversation as a durable chat record on the Brain host. Each record MUST include a stable chat id, a display title, timestamps, the eve session cursor needed to continue the thread, and the ordered stream events needed to restore the UI.

#### Scenario: First message creates a chat
- **WHEN** the user sends the first message in a new conversation
- **THEN** the system creates a durable chat record that survives process restarts of the app server

#### Scenario: Refresh restores an open chat
- **WHEN** the user refreshes the page while a saved chat is active
- **THEN** prior messages for that chat are restored from durable storage and the thread can continue

### Requirement: Sidebar history list
The system MUST show a sidebar list of saved chats ordered by most recently updated. The list MUST allow opening a chat, deleting a chat, and starting a new chat.

#### Scenario: Open a past chat
- **WHEN** the user selects a chat from the sidebar history
- **THEN** the main pane shows that chat’s restored messages and uses that chat as the active conversation

#### Scenario: Delete a chat
- **WHEN** the user deletes a chat from the sidebar
- **THEN** that chat is removed from durable storage and no longer appears in the history list

#### Scenario: New chat
- **WHEN** the user chooses New chat
- **THEN** the main pane shows an empty conversation ready for a fresh thread that does not continue the previous chat’s session cursor

### Requirement: Local single-tenant storage only
Chat history MUST be stored on the local host (or a path configured for that host). The system MUST NOT require Neon, Supabase, Redis, Elasticsearch, ClickHouse, Convex, or other hosted databases for this capability. The system MUST NOT introduce a login gate for chat history in this change.

#### Scenario: History works without cloud DB credentials
- **WHEN** the operator runs Brain with only local configuration and no hosted database credentials
- **THEN** chat create/list/open/delete and resume still work

### Requirement: Chat history HTTP API
The system MUST expose same-origin HTTP APIs to list chats, create a chat, fetch one chat (including session cursor and events), update persistence fields during/after a turn, and delete a chat.

#### Scenario: List chats
- **WHEN** the client requests the chats collection
- **THEN** it receives chat summaries suitable for the sidebar (id, title, timestamps) without requiring a third-party auth cookie

#### Scenario: Fetch chat for resume
- **WHEN** the client requests a specific chat id
- **THEN** the response includes the stored session cursor and ordered events needed to remount the agent UI
