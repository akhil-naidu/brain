## Why

The morning brief can already run on a schedule. Users also want their own saved playbooks (“Triage inbox”, “Sprint risks”) to fire the same way into chat and optional Slack.

## What Changes

- Persist playbook schedules on the host (prompt snapshot — not browser-only localStorage)
- Run a scheduled playbook into a new chat on cadence / Run now / host cron
- Optional Slack delivery (same path as morning brief)
- Empty-state UI to add, enable, run, and delete schedules from saved playbooks

## Capabilities

### New Capabilities

- `scheduled-playbooks`: Host-side schedules for saved playbook prompts

### Modified Capabilities

- _(none)_

## Impact

- New `.eve/scheduled-playbooks.json`, APIs, eve minute tick, empty-state panel
- Snapshots prompt text at schedule time so unattended runs do not need the browser
