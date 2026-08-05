## Context

Playbooks live in browser localStorage. Schedules fire from Next/eve on the host. Morning brief already has create-chat + eve session + optional Slack.

## Decisions

1. **Server snapshot** — each schedule stores `label` + `prompt` (and optional `sourcePlaybookId` for UI). Editing a local playbook later does not change the schedule unless the user updates it.
2. **Shared turn runner** — extract chat+Slack execution used by morning brief and playbook schedules.
3. **Multiple schedules** — up to 6; each has its own time / Slack / last-run markers.
4. **Minute tick** — eve schedule also POSTs `/api/playbook-schedules/run` for due jobs.

## Non-goals

- Syncing schedules across browsers/devices beyond the host `.eve` file
- Editing the live playbook automatically updating schedules
- Complex calendars (RRULE, one-shot dates)
