# chat-persistence Specification

## Purpose

Local durable chat history for Brain: create, list, open, delete, and resume conversations after refresh using host-local storage scoped to the signed-in user and active workspace, without hosted cloud databases.

## Requirements

### Requirement: Durable chat records on the host
The system MUST persist each conversation as a durable chat record on the Brain host within the active workspace. Each record MUST include a stable chat id, the creating user id, the workspace id, a visibility of `personal` or `shared`, a monotonic revision, a display title, timestamps, the eve session cursor needed to continue the thread, and the ordered stream events needed to restore the UI. Personal chats are owned by the creating user. Shared chats are readable and continuable by any member of that workspace.

#### Scenario: First message creates a chat
- **WHEN** a signed-in user sends the first message of a new conversation in a workspace
- **THEN** the system creates a durable chat record in that workspace that survives process restarts of the app server

#### Scenario: Refresh restores an open chat
- **WHEN** a signed-in user refreshes the page while a saved chat they can access in the active workspace is active
- **THEN** prior messages for that chat are restored from durable storage and the thread can continue

### Requirement: Sidebar lists accessible chats
The system MUST show a sidebar list of chats the signed-in user can access in the active workspace: their personal chats plus shared chats in that workspace, ordered by most recently updated. The list MUST allow opening a chat, deleting a chat when authorized, and starting a new chat. Chats the user cannot access MUST NOT appear.

#### Scenario: Open a past chat
- **WHEN** the signed-in user selects a chat from the sidebar history
- **THEN** the main pane shows that chat’s restored messages and uses that chat as the active conversation

#### Scenario: Delete a chat
- **WHEN** the signed-in user deletes a chat they are allowed to delete
- **THEN** that chat is removed from durable storage and no longer appears in the history list

#### Scenario: New chat
- **WHEN** the signed-in user chooses New chat
- **THEN** the main pane shows an empty conversation ready for a fresh personal thread that does not continue the previous chat’s session cursor

#### Scenario: Other users’ personal chats are hidden
- **WHEN** user A has personal chats in workspace W and user B signs in with active workspace W
- **THEN** user B’s sidebar does not list user A’s personal chats

#### Scenario: Other workspace chats are hidden
- **WHEN** a user has chats in workspace A and switches active workspace to B
- **THEN** the sidebar lists only chats accessible in workspace B

### Requirement: Local single-tenant storage only
Chat history MUST be stored on the local host (or a path configured for that host) using the host-local store (SQLite by default). The system MUST NOT require Neon, Supabase, Redis, Elasticsearch, ClickHouse, Convex, or other hosted databases for this capability. Login sessions are required for access; hosted auth platforms are not.

#### Scenario: History works without cloud DB credentials
- **WHEN** the operator runs Brain with only local configuration and no hosted database credentials
- **THEN** authenticated chat create/list/open/delete and resume still work against the host-local store

### Requirement: Chat persistence APIs enforce access
The system MUST expose same-origin HTTP APIs to list chats, create a chat, fetch one chat (including session cursor and events), update persistence fields during/after a turn, and delete a chat. Each API MUST require an authenticated session and active workspace membership. Personal chats MUST only be returned or mutated for their owner. Shared chats MUST be readable and updatable by any member of the workspace; delete MUST follow shared-chat delete controls.

#### Scenario: List chats
- **WHEN** a signed-in client requests the chats collection for the active workspace
- **THEN** it receives chat summaries (id, title, timestamps, visibility, revision) for accessible chats only

### Requirement: Updates may be rejected as conflicts
Successful content mutations MUST advance the chat revision. Shared-chat updates that omit or mismatch `expectedRevision` MUST be rejected as a conflict without applying the mutation. Personal chats MAY omit `expectedRevision` (last-write-wins); when supplied, a mismatch MUST also be rejected as a conflict.

#### Scenario: Shared update without revision is rejected
- **WHEN** a client updates a shared chat without `expectedRevision`
- **THEN** the system rejects the request as a conflict and leaves the stored chat unchanged

#### Scenario: Fetch chat for resume
- **WHEN** a signed-in client requests a specific chat id they can access in the active workspace
- **THEN** the response includes the session cursor and events needed to restore the UI

#### Scenario: Fetch another user’s personal chat is denied
- **WHEN** a signed-in client requests a personal chat id owned by a different user
- **THEN** the system responds as not found or forbidden and does not leak the chat contents

#### Scenario: Fetch other workspace chat is denied
- **WHEN** a signed-in client requests a chat id that exists only in a workspace that is not active (or they do not belong to)
- **THEN** the system responds as not found or forbidden
