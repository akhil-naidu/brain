## Context

Slack write tools require HITL approval in Brain’s MCP connections, so an unattended schedule cannot post via the agent tool path. Chat OAuth tokens for the anonymous local principal already include `chat:write`.

## Decisions

1. **Post via Slack Web API** after the brief chat turn completes, using `getStoredAccessToken(slack, ANONYMOUS_CHAT_PRINCIPAL)`.
2. **Target** — channel id (`C…` / `G…`) or `#channel-name` (resolved with `conversations.list`).
3. **Soft fail** — Slack errors are recorded (`lastSlackError`) and returned; the chat brief still succeeds.
4. **Config** — `slackDeliveryEnabled` + `slackChannel` on `.eve/scheduled-brief.json`.

## Non-goals

- Slack bot/eve Slack channel
- DM-by-email or @username lookup beyond channel names/ids
- Approving MCP send tools for schedules
