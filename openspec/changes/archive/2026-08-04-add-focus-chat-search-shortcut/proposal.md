## Why

Finding an old chat is faster with the keyboard. Users already have a search field; they need a shortcut to jump into it.

## What Changes

- Add `⌘/Ctrl+K` to focus the sidebar chat search field.
- Open the sidebar first if it is collapsed.
- Show the shortcut near the search control.
- Optionally support `/` when focus is not already in an editable field.

## Capabilities

### New Capabilities

- `focus-chat-search-shortcut`: Keyboard shortcut to focus chat history search.

### Modified Capabilities

- (none)

## Impact

- Keyboard helper + shell listener
- Sidebar search focus wiring + hint
- Tests
