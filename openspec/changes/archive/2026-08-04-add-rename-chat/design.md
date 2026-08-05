## Context

See proposal.md — Why. `updateChat(id, { title })` and SQLite `ChatStore.updateChat` already persist titles. Sidebar only supports select + delete today.

## Goals / Non-Goals

**Goals:**
- Inline rename from the sidebar next to delete
- Reuse existing PATCH title path
- Keep title length consistent with fallback titles

**Non-Goals:**
- Server-generated LLM titles
- Renaming unsaved draft rows
- Bulk rename

## Decisions

1. **UI** — Pencil control on hover (mirrors delete). Clicking swaps the title into an `<input>`; Enter/blur saves, Escape cancels.
2. **Persistence** — `BrainChatShell` calls `updateChat(id, { title: normalizeChatTitle(raw) })`, then updates local `chats` + `active.title` via existing upsert helpers.
3. **Normalization** — Export `normalizeChatTitle` from `lib/chat/title.ts`: trim, empty → `DEFAULT_CHAT_TITLE`, truncate to the same max as fallback titles (72 graphemes).
4. **No dispose/navigation** — Rename does not switch chats or dispose the session.

## Risks / Trade-offs

- [Accidental blur while editing] → Escape cancels; blur saves only when value changed, otherwise exits edit mode.
- [Race with auto title on first message] → Manual rename wins; later `onChatUpdated` from event persistence should not overwrite title unless the API returns a different title (store only changes title when PATCH includes it).
