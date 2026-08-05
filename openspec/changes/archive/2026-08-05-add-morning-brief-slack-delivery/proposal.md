## Why

Scheduled morning briefs land in chat only. Operators who live in Slack want the same brief pushed there without opening Brain.

## What Changes

- Optional Slack delivery on the morning-brief schedule (channel id or `#name`)
- After a successful brief chat run, post the brief text with the stored Slack OAuth token (no HITL)
- Schedule UI to enable Slack delivery and set the target
- Soft-fail Slack errors so the chat brief still succeeds

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `scheduled-morning-brief`: optional Slack delivery after chat brief

## Impact

- Schedule config, run path, empty-state panel
- Uses existing Slack MCP OAuth token store — no Vercel Connect / Slack bot channel
