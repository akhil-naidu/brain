## MODIFIED Requirements

### Requirement: Durable chat records on the host
The system MUST persist each conversation as a durable chat record on the Brain host, owned by the authenticated user who created it. Each record MUST include a stable chat id, the owning user id, a display title, timestamps, the eve session cursor needed to continue the thread, and the ordered stream events needed to restore the UI.

#### Scenario: First message creates a chat
- **WHEN** a signed-in user sends the first message in a new conversation
- **THEN** the system creates a durable chat record owned by that user that survives process restarts of the app server

#### Scenario: Refresh restores an open chat
- **WHEN** a signed-in user refreshes the page while a saved chat they own is active
- **THEN** prior messages for that chat are restored from durable storage and the thread can continue

### Requirement: Sidebar history list
The system MUST show a sidebar list of saved chats **owned by the signed-in user**, ordered by most recently updated. The list MUST allow opening a chat, deleting a chat, and starting a new chat. Chats owned by other users MUST NOT appear.

#### Scenario: Open a past chat
- **WHEN** the signed-in user selects a chat from the sidebar history
- **THEN** the main pane shows that chat’s restored messages and uses that chat as the active conversation

#### Scenario: Delete a chat
- **WHEN** the signed-in user deletes a chat from the sidebar
- **THEN** that chat is removed from durable storage and no longer appears in the history list

#### Scenario: New chat
- **WHEN** the signed-in user chooses New chat
- **THEN** the main pane shows an empty conversation ready for a fresh thread that does not continue the previous chat’s session cursor

#### Scenario: Other users’ chats are hidden
- **WHEN** user A has saved chats and user B signs in
- **THEN** user B’s sidebar does not list user A’s chats

### Requirement: Local single-tenant storage only
Chat history MUST be stored on the local host (or a path configured for that host) using the host-local store (SQLite by default). The system MUST NOT require Neon, Supabase, Redis, Elasticsearch, ClickHouse, Convex, or other hosted databases for this capability. Login sessions are required for access; hosted auth platforms are not.

#### Scenario: History works without cloud DB credentials
- **WHEN** the operator runs Brain with only local configuration and no hosted database credentials
- **THEN** authenticated chat create/list/open/delete and resume still work against the host-local store

### Requirement: Chat history HTTP API
The system MUST expose same-origin HTTP APIs to list chats, create a chat, fetch one chat (including session cursor and events), update persistence fields during/after a turn, and delete a chat. Each API MUST require an authenticated session and MUST only return or mutate chats owned by that user.

#### Scenario: List chats
- **WHEN** a signed-in client requests the chats collection
- **THEN** it receives chat summaries suitable for the sidebar (id, title, timestamps) for that user only

#### Scenario: Fetch chat for resume
- **WHEN** a signed-in client requests a specific chat id they own
- **THEN** the response includes the stored session cursor and ordered events needed to remount the agent UI

#### Scenario: Fetch another user’s chat is denied
- **WHEN** a signed-in client requests a chat id owned by a different user
- **THEN** the system rejects the request or reports not found without leaking the other user’s content
