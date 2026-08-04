## Why

Persisted chats get auto titles from the first message. Users need to rename them so the sidebar stays scannable as history grows.

## What Changes

- Add a Rename control on each saved chat in the sidebar.
- Persist the new title through the existing chat update API (`PATCH` title).
- Update the sidebar list and active header title after a successful rename.
- Empty/whitespace titles fall back to the default chat title (same as store rules).

## Capabilities

### New Capabilities

- `rename-chat`: Rename a persisted chat from the sidebar.

### Modified Capabilities

- (none)

## Impact

- `ChatSidebar` UI (rename affordance + inline edit)
- `BrainChatShell` handler calling `updateChat({ title })`
- Optional title normalization helper + tests
- Non-goals: LLM auto-titles, multi-user auth, folder/organization
