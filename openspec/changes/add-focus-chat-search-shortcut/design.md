## Context

See proposal.md — Why. Sidebar already filters by title. New-chat uses `⌘⇧O` via `lib/chat/keyboard.ts`.

## Goals / Non-Goals

**Goals:**
- `⌘/Ctrl+K` focuses search
- Opens sidebar when collapsed
- Discoverable hint on the search field

**Non-Goals:**
- Full command palette
- Searching message bodies

## Decisions

1. **Combo** — `meta/ctrl + k` (no shift/alt).
2. **Focus signal** — shell increments `searchFocusRequest`; sidebar focuses/selects the input in an effect.
3. **Slash** — also treat bare `/` when the event target is not an editable element (input/textarea/select/contenteditable).
4. **Label** — `⌘K` / `Ctrl+K` via shared helper.

## Risks / Trade-offs

- [Browser find-in-page on some platforms] → Accept; in-app handler preventDefaults when matched.
