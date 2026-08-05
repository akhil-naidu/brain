## Why

As saved chats grow, scrolling the sidebar becomes slow. Users need a quick way to find a conversation by title without deleting or renaming first.

## What Changes

- Add a search field in the chat sidebar that filters the saved chat list by title.
- Case-insensitive substring match on the displayed title.
- Show an empty-state message when the query matches nothing.
- No server-side search API in this change (client filter over the already-loaded list).

## Capabilities

### New Capabilities

- `search-chat-history`: Filter the sidebar chat list by title query.

### Modified Capabilities

- (none)

## Impact

- `ChatSidebar` search input + filter
- Small title-filter helper + tests
- Non-goals: full-text search of message bodies, server query params, fuzzy ranking
