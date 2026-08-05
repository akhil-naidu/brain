## Context

Morning brief prompt already exists. Chat history is SQLite under `.eve/`. eve schedules fire under production `eve start` (and Brain’s `start-production.mjs`), not during `pnpm dev` cron cadence.

## Decisions

1. **Chat-first** — each run creates a titled chat and starts an eve session with `MORNING_BRIEF_PROMPT`; no Slack in v1.
2. **Config file** — `.eve/scheduled-brief.json` (enable, hour, minute, timezone, weekdaysOnly, last run markers).
3. **Run in Next** — `POST /api/briefs/run` owns create-chat + `eve/client` session + persist events; eve schedule only HTTP-triggers when due.
4. **Due once per local day** — timezone-aware hour/minute match; `force` skips the due check for host cron / Run now.
5. **Dev** — Run now + optional host crontab; automatic ticks need production eve process.

## Non-goals

- Slack / email delivery
- Vercel Cron
- In-browser-only timers as the primary scheduler
- Multi-user / authenticated trigger tokens beyond the trusted local channel
