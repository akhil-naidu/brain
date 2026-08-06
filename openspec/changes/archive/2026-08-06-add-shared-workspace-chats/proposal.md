## Why

Team workspaces already share playbooks and schedules, but chats are private per member. Collaborators cannot continue the same Brain thread. Shared workspace chats close that gap without making every chat public.

## What Changes

- Add chat `visibility`: `personal` (default) or `shared`
- In a **team** workspace, members can create shared chats; all members can list/open/continue them
- Personal chats remain private to the creator (unchanged)
- Personal workspaces stay personal-only (cannot create shared)
- Delete: personal → owner only; shared → creator or workspace owner/admin
- Sidebar shows a Shared marker and a way to start a shared chat

## Non-goals

- Per-message authorship UI / @mentions
- Fine-grained share to a subset of members
- Converting shared → personal
- Cloud multi-tenant DB

## Capabilities

### New Capabilities

- `shared-workspace-chats`: Visibility rules and team shared-chat UX

### Modified Capabilities

- `chat-persistence`: Access model includes shared chats in the active workspace

## Impact

- SQLite chat schema + store APIs
- `/api/chats` create/list/get/patch/delete authz
- Sidebar / new-chat controls
- Design doc data-ownership note (personal default + optional shared)
