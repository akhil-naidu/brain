## Why

Users need to share screenshots, PDFs, and short text files with Brain so it can reason about real work artifacts next to ClickUp/Slack/Gmail context.

## What Changes

- Attach images, PDFs, and text files from the composer (picker, paste images, drag-and-drop)
- Preview and remove pending attachments before send
- Send multipart `UserContent` (text + file data URLs) through `useEveAgent().send`
- Enforce small per-message limits

## Capabilities

### New Capabilities

- `chat-attachments`: Composer file attachments for chat turns

### Modified Capabilities

- _(none)_

## Impact

- Composer UI, ephemeral chat send path, attachment helpers
