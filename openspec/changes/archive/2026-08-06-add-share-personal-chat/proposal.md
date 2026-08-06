## Why

Shared chats can only be created as new threads today. Owners often start privately and later want teammates in the same conversation.

## What Changes

- Allow the chat owner to change a **personal** chat to **shared** in a team workspace
- PATCH chat API accepts `visibility: "shared"` (owner only; team workspace only)
- Sidebar “Share” action on personal chats when shared chats are allowed
- One-way for this slice (no unshare / shared → personal)

## Non-goals

- Sharing to a subset of members
- Unsharing
- Concurrent-edit hardening (next slice)

## Capabilities

### Modified Capabilities

- `shared-workspace-chats`: Owner may promote personal → shared
- `chat-persistence`: PATCH may update visibility under those rules

## Impact

- Chat store + `/api/chats/[id]`
- Sidebar share control
