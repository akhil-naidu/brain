## MODIFIED Requirements

### Requirement: Durable chat records on the host
The system MUST persist each conversation as a durable chat record in the Brain instance’s Postgres database within the active workspace. Each record MUST include a stable chat id, the creating user id, the workspace id, a visibility of `personal` or `shared`, a monotonic revision, a display title, timestamps, the eve session cursor needed to continue the thread, and the ordered stream events needed to restore the UI. Personal chats are owned by the creating user. Shared chats are readable and continuable by any member of that workspace.

#### Scenario: First message creates a chat
- **WHEN** a signed-in user sends the first message of a new conversation in a workspace
- **THEN** the system creates a durable chat record in that workspace that survives process restarts of the app server

#### Scenario: Refresh restores an open chat
- **WHEN** a signed-in user refreshes the page while a saved chat they can access in the active workspace is active
- **THEN** prior messages for that chat are restored from durable storage and the thread can continue

### Requirement: Local single-tenant storage only
Chat history MUST be stored in the operator-configured Postgres database for the Brain instance. The system MUST NOT require Neon, Supabase, Redis, Elasticsearch, ClickHouse, Convex, or other hosted-only database products for this capability. The system MUST NOT use host SQLite files as the chat store. Login sessions are required for access; hosted auth platforms are not.

#### Scenario: History requires Postgres
- **WHEN** a signed-in user creates or lists chats with Postgres configured
- **THEN** authenticated chat create/list/open/delete and resume work against the Postgres store

#### Scenario: SQLite chat files are not used
- **WHEN** Brain is running with Postgres configured
- **THEN** chat persistence does not read or write `.eve/brain-chats.sqlite`
