## Why

The morning brief starter only runs when someone clicks it. Self-hosted Brain should be able to deliver that same brief into a chat on a local schedule (while the host is up), without cloud schedulers.

## What Changes

- Persist a local morning-brief schedule (enable, time, timezone, weekdays)
- Run the brief into a new persisted chat (reuse the morning-brief prompt)
- Fire automatically via an eve minute schedule when Brain production is running
- UI to configure, run now, and copy a host-crontab fallback
- Manual `POST /api/briefs/run` for host cron / testing

## Capabilities

### New Capabilities

- `scheduled-morning-brief`: Local schedule that delivers the morning brief into a chat

### Modified Capabilities

- _(none)_

## Impact

- New `.eve` schedule config, Next API routes, eve `agent/schedules/`, empty-state schedule panel
- No Slack delivery, no Vercel Cron, no multi-user auth
