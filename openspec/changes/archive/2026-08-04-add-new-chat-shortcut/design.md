## Context

See proposal.md — Why. `BrainChatShell.handleNewChat` already disposes the current session and resets to a draft chat.

## Goals / Non-Goals

**Goals:**
- Global-in-app shortcut matching common chat apps
- Same disposal/navigation path as the button
- Unit-tested key matching

**Non-Goals:**
- Configurable keybindings
- Shortcut palette / command menu

## Decisions

1. **Combo** — `meta/ctrl + shift + o` (ChatGPT-like).
2. **Helper** — `isNewChatShortcutEvent` in `lib/chat/keyboard.ts`.
3. **Listener** — `window` `keydown` in `BrainChatShell`; `preventDefault` when matched; call `handleNewChat`.
4. **Hint** — `title` / visible hint on sidebar New chat button (`⌘⇧O` / `Ctrl+Shift+O` via `navigator.platform` or simple dual text `⌘/Ctrl+Shift+O`).

## Risks / Trade-offs

- [Browser/OS conflicts] → Uncommon combo; accept rare collisions.
