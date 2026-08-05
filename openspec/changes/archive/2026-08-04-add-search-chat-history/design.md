## Context

See proposal.md — Why. The sidebar already receives `chats: ChatSummary[]` from `BrainChatShell`. Titles are local; no search API exists.

## Goals / Non-Goals

**Goals:**
- Fast client-side title filter in the sidebar
- Accessible search input with empty-results copy
- Unit-tested filter helper

**Non-Goals:**
- Searching message bodies / events
- Server-side `?q=` on `/api/chats`
- Persisting the query across reloads

## Decisions

1. **Filter helper** — `filterChatsByTitle(chats, query)` in `lib/chat/filter-chats.ts`: trim query; empty → return all; else case-fold substring match on `title`.
2. **UI** — Search input above the “Chats” list (below New chat). Keep draft/new-chat row visible regardless of query (it’s not in `chats`).
3. **Empty state** — When `query.trim()` is non-empty and filtered length is 0, show “No chats match” (or similar). Keep the existing “No chats yet” when there are zero chats and query is empty.
4. **No shell changes** — Filtering stays inside `ChatSidebar`.

## Risks / Trade-offs

- [Large local lists] → Acceptable for v1 SQLite local history; revisit server filter later if needed.
- [Diacritics / locale] → Simple `toLocaleLowerCase()` substring; good enough for v1.
