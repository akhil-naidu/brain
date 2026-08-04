## Why

Users often want one reply or prompt on the clipboard without exporting the whole thread.

## What Changes

- Add a Copy control on each message that has exportable content.
- Copy that message’s Markdown body to the clipboard with brief feedback.
- Reuse the existing Markdown serialization helpers.

## Capabilities

### New Capabilities

- `copy-message`: Copy a single chat message to the clipboard as Markdown.

### Modified Capabilities

- (none)

## Impact

- Message UI copy control
- `messageToMarkdown` helper + tests
- Non-goals: rich HTML copy, server export
