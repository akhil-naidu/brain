## Why

Users need a quick way to take a Brain conversation into notes, email, or another tool. Persistence stores chats, but there is no export affordance yet.

## What Changes

- Convert the visible chat thread to readable Markdown (user/assistant text; brief tool notes).
- Add a Copy chat control when the thread has messages.
- Copy to the system clipboard with brief success/failure feedback.
- No file download or server-side export in this change.

## Capabilities

### New Capabilities

- `copy-chat-markdown`: Copy the current conversation to the clipboard as Markdown.

### Modified Capabilities

- (none)

## Impact

- Markdown serialization helper + tests
- Chat shell / agent chat UI control
