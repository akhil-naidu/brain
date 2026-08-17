## Context

See proposal.md for motivation. Brain already has `agent/channels/eve.ts` (Better Auth), Slack as **MCP user OAuth** (`agent/connections/slack.ts`) for tools, and outbound `chat.postMessage` for morning-brief delivery. Eve ships `slackChannel` from `eve/channels/slack` with HITL buttons, DMs, mentions, and **portable** `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`. Default eve Slack docs push Vercel Connect; Brain must not.

`decideToolAuthorization` already treats unattended (schedules) as Auto HITL. Slack people are present, so inbound must stay **interactive**. Turn mode/unattended today come from browser `clientContext` on messages; Slack `send()` does not pass that object.

## Goals / Non-Goals

**Goals:**

- One `agent/channels/slack.ts` using portable credentials and Brain `sessionAuthContext`
- Fail-closed Slack user → Brain user mapping
- Interactive posture HITL as Slack buttons (eve default `input.requested`)
- Personal Postgres chat per Slack thread for sidebar history

**Non-Goals:**

- `@vercel/connect` / `connectSlackCredentials`
- Socket Mode
- Continuing a Slack session from the browser composer (sidebar is a transcript; the live loop stays on Slack)
- Replacing Slack MCP user tokens with the bot token for tools

## Decisions

### 1. eve `slackChannel` with portable credentials
- **Choice:** `import { slackChannel } from "eve/channels/slack"` and pass `credentials` resolved from instance-stored host file then env (`SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`). Never install `@vercel/connect`.
- **Why:** Eve already verifies signatures, acks within 3s, maps HITL to Block Kit, and routes `/eve/v1/slack` through `withEve()`.
- **Alternative:** Hand-rolled Events API route — duplicates verification, interactivity, and HITL.

### 2. Custom `onDirectMessage` / `onAppMention` / `onMessage`
- **Choice:** Drop bot authors. Handle `/new` via `ctx.reset` and a short confirmation post (do not `send` `/new`). Dispatch only DMs, mentions, or `ctx.isSubscribed()`. Return `{ auth: sessionAuthContext(userId, workspaceId) }` after mapping; return `null` after an ephemeral/DM refusal when unmapped.
- **Why:** Default `defaultSlackAuth` is Slack-user-scoped, not a Brain principal, so MCP grants would miss.
- **Alternative:** `auth: null` — forbidden (anonymous).

### 3. Identity table filled at Slack MCP Connect
- **Choice:** Postgres `brain_slack_identity` (`user_id`, `workspace_id`, `slack_team_id`, `slack_user_id`, unique on team+user). After a successful Slack token store, call Slack `auth.test` with the **user** MCP token and upsert. Disconnect deletes that row. Lookup: team+user id first; else bot `users.info` email uniquely matching Better Auth email (case-insensitive); else refuse.
- **Why:** User OAuth is the reliable Slack user id. Email is a one-time on-ramp if they have a Brain account but have not Connected yet.
- **Alternative:** Email-only — breaks display-name-only Slack profiles and collides on shared inboxes.

### 4. Workspace for the turn
- **Choice:** Prefer a workspace where this user has a Slack MCP grant (most recently updated identity row). Else `resolveActiveWorkspace`. Put `workspaceId` on auth attributes (same as browser).
- **Why:** Tools should see the Slack grant. Active workspace alone can be a team space where Slack was never connected.
- **Alternative:** Always personal workspace — wrong for people who only connected Slack in a team space.

### 5. Force Agent + interactive on Slack channel
- **Choice:** On Slack `turn.started` (or existing sync helpers), set `turnChatMode` to `agent` and `turnUnattended` to `false`. Enable connection tools for grants in that workspace (same set scheduled runs use). Do not set `unattended` in client context.
- **Why:** Slack `send()` does not attach Brain `clientContext`; without this, mode defaults to Agent anyway but unattended must not flip true, and Strict must HITL.
- **Alternative:** Treat Slack as unattended — would skip Strict and hang-avoid like schedules; wrong because a human is in Slack.

### 6. Sidebar chats are transcripts
- **Choice:** Table `brain_slack_thread_chat` unique on `(slack_team_id, slack_channel_id, slack_thread_ts)` → `chat_id`. On first dispatch, `createChat` (personal, title from first message / “Slack DM”). On turn completion, snapshot eve events into that chat (same idea as `runScheduledPromptTurn`). `/new` inserts a new chat and remaps the thread.
- **Why:** Spec requires sidebar history; Slack and eve HTTP channels do not share continuation tokens, so the browser cannot resume the Slack session.
- **Alternative:** Slack-only durability in eve workflow store — no Brain sidebar.

### 7. Bot credentials storage
- **Choice:** Host file under `.eve/` (instance-admin Tools → Slack inbound) with env fallback, mirroring MCP app credentials. Bot token is **not** the MCP client secret.
- **Why:** Brain prefers UI Set up; env remains deploy-time. Signing secret must never be logged.
- **Alternative:** Env-only — acceptable fallback if UI slips; still no Connect.

## Risks / Trade-offs

- **[Same Slack app vs two apps]** MCP user OAuth and Events bot scopes often live on one Slack app but are easy to misconfigure → Mitigation: docs list Event Subscriptions (`app_mention`, `message.im`, `message.channels` for thread follow-ups), Interactivity Request URL `/eve/v1/slack`, bot scopes (`chat:write`, `im:history`, `im:write`, `users:read`, `users:read.email`, channel history as needed).
- **[Email mapping spoof]** Unverified Slack emails → Mitigation: prefer stored Connect ids; email only when unique; refuse otherwise.
- **[HITL clicker ≠ speaker]** Someone else in a channel could press Approve → Mitigation: eve attaches the interacting Slack user; Brain MUST ignore approve/deny unless that Slack user maps to the **same** Brain principal as the session (fail closed).
- **[3-second Slack timeout]** Slow mapping/DB → Mitigation: ack first (eve already `waitUntil`s dispatch); keep mapping queries short.
- **[Browser vs Slack history]** Opening the sidebar chat cannot continue the Slack eve session → Mitigation: document “read in Brain, reply in Slack”; v2 could deep-link.

## Migration Plan

1. Deploy channel + identity table. Existing hosts: inbound off until bot env/UI is set. Slack MCP Connect unchanged except extra `auth.test` upsert.
2. Users who already Connected Slack: next Connect or a one-shot `auth.test` on existing stored user tokens backfills identity.
3. Rollback: remove `agent/channels/slack.ts` / unset bot env. Identity table can remain unused.

## Open Questions

_(none — Socket Mode, browser resume, and workspace tighten-only stay deferred products.)_
