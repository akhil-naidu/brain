## Why

Users need a single daily entry point that pulls signal across ClickUp, Slack, Asana, Gmail, and dFlow instead of picking one app chip at a time.

## What Changes

- Add a primary empty-state starter: “What's waiting on me?”
- Send a structured morning-brief prompt that skips unavailable connections
- Teach the agent how to format a short cross-app brief
- Visually emphasize the primary chip

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `welcome-prompt-chips`: Primary morning-brief starter

## Impact

- `lib/chat/welcome-prompts.ts`, welcome UI, `agent/instructions.md`
