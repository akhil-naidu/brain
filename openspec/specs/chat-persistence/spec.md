# chat-persistence Specification

## Purpose

Durable chat history for Brain: create, list, open, delete, and resume conversations after refresh using the instance Postgres store scoped to the signed-in user and active workspace, without requiring Neon or other hosted-only database products.

## Requirements

### Requirement: Durable chat records on the host
The system MUST persist each conversation as a durable chat record in the Brain instance’s Postgres database within the active workspace. Each record MUST include a stable chat id, the creating user id, the workspace id, a visibility of `personal` or `shared`, a monotonic revision, a display title, timestamps, the eve session cursor needed to continue the thread, and the ordered stream events needed to restore the UI. Personal chats are owned by the creating user. Shared chats are readable and continuable by any member of that workspace.

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
Chat history MUST be stored in the operator-configured Postgres database for the Brain instance. The system MUST NOT require Neon, Supabase, Redis, Elasticsearch, ClickHouse, Convex, or other hosted-only database products for this capability. The system MUST NOT use host SQLite files as the chat store. Login sessions are required for access; hosted auth platforms are not.

#### Scenario: History requires Postgres
- **WHEN** a signed-in user creates or lists chats with Postgres configured
- **THEN** authenticated chat create/list/open/delete and resume work against the Postgres store

#### Scenario: SQLite chat files are not used
- **WHEN** Brain is running with Postgres configured
- **THEN** chat persistence does not read or write `.eve/brain-chats.sqlite`

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

### Requirement: Slack threads persist as personal Brain chats
Each Slack conversation the agent handles (a DM, or a channel thread started by mention) MUST be stored as a personal Brain chat owned by the mapped user in the workspace used for that turn. The chat MUST survive app restarts and MUST appear in that user's sidebar for that workspace. Follow-up Slack messages in the same Slack team, channel, and thread MUST update the same chat rather than creating a duplicate. The mapped owner MUST be able to send from that Brain chat; the system MUST post the user prompt and the assistant reply into the linked Slack thread.

#### Scenario: First Slack DM creates a personal chat
- **WHEN** a mapped user sends the first DM to the Brain bot
- **THEN** a personal chat appears in that user's Brain sidebar for the workspace used on the turn

#### Scenario: Same Slack thread resumes one chat
- **WHEN** the same mapped user sends another message in the same Slack DM or thread
- **THEN** the existing Brain chat is updated and a second chat is not created for that thread

#### Scenario: Other users do not see the Slack chat
- **WHEN** user A has a personal Slack-origin chat in workspace W
- **THEN** user B's sidebar in W does not list that chat

#### Scenario: Owner continues the Slack thread from Brain
- **WHEN** the mapped owner sends a message from that personal Slack sidebar chat
- **THEN** Brain runs an Agent turn in the browser and posts the prompt and assistant reply into the linked Slack thread
