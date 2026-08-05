## Context

Welcome chips already send static prompts. The morning brief is a stronger default starter plus agent guidance — not a new scheduler or background job.

## Decisions

1. **Prompt-first** — no host cron; user clicks the chip (or types the ask).
2. **Enabled + signed-in only** — prompt and instructions tell the model to skip missing connections.
3. **Primary chip** — first in the list with slightly stronger empty-state styling.

## Non-goals

- Scheduled morning delivery
- Automatic connection enable/Connect
- New MCP tools
