## Why

Long chats reprocessed settled message rows on every streamed token, which felt like UI jank even when only the latest assistant message changed.

## What Changes

- Memoize `AgentMessage` with a settled-row comparator (ignore parent callback identity when no pending HITL input)
- Keep row action handlers ref-stable from the chat shell
- Pass subagent failure maps only to the active message
- Cover the comparator with unit tests

## Non-goals

- Message list virtualization
- Changing eve's message reducer
- Vercel infra / auth / persistence changes
