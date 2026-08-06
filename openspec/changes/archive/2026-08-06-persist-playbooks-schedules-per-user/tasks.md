## 1. Storage

- [x] 1.1 Add SQLite tables for `playbook`, `playbook_schedule`, and `morning_brief_schedule` with `user_id` (prefer shared chats DB)
- [x] 1.2 Implement store modules with per-user CRUD + existing validation/limits
- [x] 1.3 One-time import of `.eve/scheduled-playbooks.json` and `.eve/scheduled-brief.json` into operator/first user when tables empty

## 2. Auth + APIs

- [x] 2.1 Add `/api/playbooks` CRUD gated by `requireSessionUserId()`
- [x] 2.2 Gate existing playbook-schedule and morning-brief schedule APIs on session; scope all reads/writes by `userId`
- [x] 2.3 Extend `session-from-request` so internal bearer + `x-brain-run-as-user` resolves to that user id

## 3. Runners

- [x] 3.1 `runScheduledPromptTurn` / brief / playbook runners use schedule owner `userId` and pass run-as header to eve
- [x] 3.2 Eve minute due checks iterate per-user schedules/briefs

## 4. UI

- [x] 4.1 Replace playbook `localStorage` hooks with API client; keep `/playbooks` + composer UX
- [x] 4.2 One-time legacy localStorage playbook import when server list empty
- [x] 4.3 Point schedule panels at session-scoped APIs (no behavior change beyond ownership)

## 5. Verification

- [x] 5.1 Unit tests: store isolation, run-as header, migrate import
- [x] 5.2 `pnpm run verify`
