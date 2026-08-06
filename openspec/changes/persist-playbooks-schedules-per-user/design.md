## Context

Brain has Better Auth sessions and per-user chats/MCP tokens. Playbooks remain in `localStorage`; schedules in `.eve/scheduled-playbooks.json` and `.eve/scheduled-brief.json`. Schedule runs use `BRAIN_INTERNAL_TOKEN` + operator user.

## Goals / Non-Goals

Goals:
- Host SQLite persistence for playbooks + schedules with `user_id`
- Session-gated CRUD APIs
- Schedule execution as the owning user (MCP/Slack tokens for that user)
- One-time migration of host JSON schedules → first/operator user
- Optional import of browser playbooks after sign-in

Non-goals:
- Cloud sync / multi-device realtime
- Removing `BRAIN_INTERNAL_TOKEN` (still needed for headless eve calls)
- Per-user API keys / Better Auth service tokens
- Changing composer UX layout beyond data source wiring

## Decisions

### 1. Store location
- **Choice:** SQLite beside chats — either tables in `.eve/brain-chats.sqlite` or `.eve/brain-playbooks.sqlite`. Prefer **same chats DB file** with new tables (`playbook`, `playbook_schedule`, `morning_brief_schedule`) to keep one host data file for user content.
- **Why:** Already have SQLite + `user_id` patterns; one backup story.

### 2. API shape
- **Choice:** REST under `/api/playbooks` and keep `/api/playbook-schedules` + `/api/briefs/schedule`, all requiring `requireSessionUserId()`.
- **Why:** Minimal UI churn; swap storage behind existing clients.

### 3. Schedule runner identity
- **Choice:** Due/forced runs load the schedule row’s `user_id` and create chats / call eve as that principal. Bearer remains `BRAIN_INTERNAL_TOKEN`; AuthFn already maps bearer → operator today — **extend** so bearer may impersonate a specific user id via a trusted internal header (e.g. `x-brain-run-as-user`) **or** set `BRAIN_OPERATOR_USER_ID` dynamically is wrong for multi-user.
- **Preferred:** Internal schedule runner calls eve with `Authorization: Bearer BRAIN_INTERNAL_TOKEN` plus `x-brain-run-as-user: <ownerUserId>`; `session-from-request` accepts that header **only** when bearer is the internal token.
- **Why:** Keeps one host secret; correct per-user MCP/Slack.

### 4. Migration
- **Choice:** On first read after deploy, if SQLite schedule tables empty and `.eve/scheduled-*.json` exist, import into `firstAuthUserId` / `BRAIN_OPERATOR_USER_ID`. Playbooks: client POSTs legacy localStorage payload once if server list empty (flag in localStorage `brain.playbooks.migrated.v1`).
- **Why:** No silent data loss for single-operator hosts.

### 5. Morning brief
- **Choice:** One morning-brief config **per user** (not one global). Eve minute job iterates due configs across users (or per-user due check in one pass).
- **Why:** Matches per-user Slack tokens and ownership.

## Risks / Mitigations

- **[Risk] Eve cron + multi-user due scans get heavier** → Cap schedules per user (existing limit); scan is local SQLite.
- **[Risk] Internal run-as header abuse** → Only honor when bearer equals `BRAIN_INTERNAL_TOKEN`.
- **[Risk] Dual-write confusion during migrate** → Server is source of truth after first successful sync; clear/ignore localStorage playbooks after migrate flag.

## Rollout

1. SQLite schema + stores + session-gated APIs  
2. UI hooks → fetch APIs instead of localStorage  
3. Runner run-as-owner + migrate host JSON  
4. Client playbook import once  
