## Why

Starting a new chat is frequent; reaching for the sidebar slows people down. A standard keyboard shortcut makes it instant.

## What Changes

- Add `⌘/Ctrl+Shift+O` to start a new chat (same path as the New chat button).
- Show the shortcut hint on the New chat control.
- Ignore the shortcut when it would fight an editable field that already handles the same combo (none expected for this combo).

## Capabilities

### New Capabilities

- `new-chat-shortcut`: Keyboard shortcut to start a new chat.

### Modified Capabilities

- (none)

## Impact

- Brain chat shell keydown listener
- Small keyboard helper + tests
- Sidebar New chat hint
