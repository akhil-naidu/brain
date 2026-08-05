## Context

See proposal.md — Why. `BrainChatShell` already owns `sidebarOpen` and open/close buttons.

## Goals / Non-Goals

**Goals:**
- `⌘/Ctrl+B` toggles sidebar
- Discoverable labels on controls
- Unit-tested matcher

**Non-Goals:**
- Persisting sidebar open state across reloads
- Mobile drawer behavior changes

## Decisions

1. **Combo** — `meta/ctrl + b` (no shift/alt), editor-familiar.
2. **Handler** — `setSidebarOpen((open) => !open)` from the existing keydown listener.
3. **Labels** — `⌘B` / `Ctrl+B` on open/close buttons via shared helper.

## Risks / Trade-offs

- [Browser bold shortcut in contenteditable] → Chat composer is a textarea; bold rarely applies. Accept for v1.
