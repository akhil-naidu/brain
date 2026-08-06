## Why

Shared chats allow multiple members to write the same thread. Without concurrency control, interleaved PATCHes can drop events or overwrite `eveSession` (last-write-wins).

## What Changes

- Add a monotonic `revision` on each chat; PATCH accepts `expectedRevision` and fails with conflict when stale
- For **shared** chats, add a short-lived turn lock so only one member runs an agent turn at a time
- Client tracks revision, sends it on updates, acquires/releases turn lock around shared turns, and surfaces conflict errors

## Non-goals

- CRDT / merge of concurrent event streams
- Presence cursors / live multiplayer UI
- Locking personal chats

## Capabilities

### New Capabilities

- `shared-chat-concurrency`: Revision CAS + turn lock for shared chats

### Modified Capabilities

- `chat-persistence`: Chat records expose revision; updates may be rejected as conflicts

## Impact

- SQLite chat schema + store update path
- `/api/chats/[id]` PATCH (+ optional lock endpoints or same route)
- `ephemeral-agent-chat` persist / send path
