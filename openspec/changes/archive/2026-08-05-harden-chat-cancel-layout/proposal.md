## Why

Stop / New-chat cancellation still had hang and detach edge cases, and the chat shell hid history on mobile. Users feel both as broken chat UX.

## What Changes

- Keep Stop cooperative until a terminal eve boundary; never treat local `stop()` as cancel success
- Dispose active chats before remount (New chat / select / delete), with a navigation-only timeout detach
- Mobile sidebar overlay, calmer empty state + composer chrome, slightly looser message spacing

## Non-goals

- No Vercel infra, auth productization, or persistence model changes
- No broad message virtualization / streaming rerender rewrite (audit P2 remaining)

## Impact

- `app/_components/ephemeral-agent-chat.tsx`, `brain-chat-shell.tsx`
- Chat composer / conversation / welcome prompts
- Audit notes updated
