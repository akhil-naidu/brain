## 1. Identity and schema

- [x] 1.1 Add `brain_slack_identity` and `brain_slack_thread_chat` (idempotent CREATE + indexes) and bump `BRAIN_SCHEMA_REVISION`
- [x] 1.2 Store helpers: upsert/lookup identity by Slack team+user; delete on Slack MCP disconnect; resolve workspace (grant workspace, else active)
- [x] 1.3 After Slack MCP token store, call `auth.test` with the user token and upsert identity; backfill existing stored Slack tokens once
- [x] 1.4 Tests: Connect stores mapping, disconnect clears it, lookup prefers id over email, ambiguous email refuses

## 2. Slack channel (no Connect)

- [x] 2.1 Add `agent/channels/slack.ts` with `slackChannel` portable credentials (host file then `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`). Do not add `@vercel/connect`
- [x] 2.2 Resolve bot credentials for instance admins on Tools → Slack inbound (env fallback); never log the signing secret
- [x] 2.3 `onDirectMessage` / `onAppMention` / `onMessage`: map user or ephemeral-refuse; `/new` resets; ignore bots and unmentioned channel noise; return Brain `sessionAuthContext`
- [x] 2.4 Slack `turn.started`: Agent mode, `unattended=false`, enable workspace grants; HITL approve/deny only if the clicker maps to the session principal
- [x] 2.5 Tests: unsigned webhook rejected; unmapped user no turn; mapped DM uses Brain principal; Strict Slack is not unattended; foreign clicker cannot approve

## 3. Sidebar transcript

- [x] 3.1 First Slack dispatch creates a personal chat; same team+channel+thread updates it; `/new` remaps to a new chat
- [x] 3.2 On turn completion, persist eve events onto that chat (same pattern as scheduled prompt turns)
- [x] 3.3 Tests: two DMs one chat; other users do not see it; `/new` creates a second chat

## 4. Docs

- [x] 4.1 Slack connection page: Event Subscriptions and Interactivity URL `{BRAIN_PUBLIC_URL}/eve/v1/slack`, bot scopes, mapping rules, no Vercel Connect
- [x] 4.2 `.env.example` + environment reference for `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`; approvals page: Slack HITL uses instance posture, not schedule unattended rules

## 5. Verify

- [x] 5.1 `pnpm run openspec:validate` and `pnpm run verify`
