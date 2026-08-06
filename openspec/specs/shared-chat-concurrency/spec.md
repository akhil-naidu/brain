# shared-chat-concurrency Specification

## Purpose

Prevent silent data loss when multiple members edit the same shared chat by detecting stale writes and serializing agent turns.

## Requirements

### Requirement: Shared chat updates use revision checks
When updating a shared chat, the client MUST supply the revision it last observed. If the server revision differs, the system MUST reject the update as a conflict and MUST NOT apply the mutation.

#### Scenario: Stale patch rejected
- **WHEN** member A updates a shared chat after member B has already advanced its revision
- **THEN** A’s update is rejected with a conflict response and the stored chat is unchanged by A’s request

### Requirement: Shared chats serialize agent turns
A shared chat MUST allow at most one active turn lock at a time. A member MUST acquire the lock before starting an agent turn and SHOULD release it when the turn finishes. Another member MUST NOT acquire the lock while it is held and unexpired.

#### Scenario: Second member blocked while turn active
- **WHEN** member A holds an unexpired turn lock on a shared chat and member B tries to acquire it
- **THEN** B’s acquire is rejected as a conflict
