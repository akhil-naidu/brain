## Why

Brain already uses Slack as an MCP tool and can push morning briefs there, but staff still have to open the browser to talk to the agent. After instance safety posture and Auto result screening, inbound Slack is the remaining slice that puts the same governed Agent in the place people already work.

## What Changes

- Add eve’s Slack channel (`agent/channels/slack.ts`) so DMs to the Brain bot and `@mentions` (plus replies in an already-active thread) start Agent turns.
- Authenticate inbound Slack with **portable** bot token + signing secret (`SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`, with optional instance-stored credentials). **MUST NOT** use Vercel Connect, `@vercel/connect`, or `connectSlackCredentials`.
- Map the Slack actor to a signed-in Brain user (stored Slack user id from MCP Connect, else verified email). Unmapped users get a private reply with a link to connect; they MUST NOT run as anonymous or as another user.
- Run Slack turns as **interactive Agent**: instance posture HITL (Slack approve/deny buttons), command policy, and Auto/Strict result screening. Do **not** treat Slack as unattended.
- Persist each Slack thread as a **personal** Brain chat in the mapped user’s workspace so it appears in the browser sidebar.
- Document operator Event Subscriptions URL `{BRAIN_PUBLIC_URL}/eve/v1/slack`, bot scopes, and the identity mapping.

Non-goals for this change:

- Vercel Connect, `vercelOidc()`, AI Gateway, or Vercel Sandbox
- Replacing Slack MCP (tools stay on user OAuth; inbound is a bot channel)
- Persistent sandbox VMs / attached disks
- Vendoring QM / Pi / Claude Code
- LLM tool-result classifier
- Workspace tighten-only posture
- Unmentioned channel chatter, public unauthenticated bots, or Slack-only users with no Brain account
- Changing Better Auth login or the Postgres chat store product (reuse it)

## Capabilities

### New Capabilities

- `slack-inbound-channel`: DMs and @mentions reach Brain as the mapped user’s Agent turns, with Slack HITL buttons, identity fail-closed, and a durable personal chat per thread.

### Modified Capabilities

- `agent-runtime`: Slack channel is a first-class eve channel using portable credentials, not Vercel Connect; `/eve/v1/slack` is reachable on the self-hosted origin.
- `mcp-connections`: Completing Slack MCP Connect records Slack user/team ids for inbound mapping; bot credentials are separate from MCP client id/secret.
- `chat-persistence`: Slack threads upsert personal chats keyed by Slack team + channel + thread.
- `chat-agent-modes`: Slack inbound is Agent; Ask/Plan constraints still win if a Slack turn were somehow Ask/Plan; posture, command policy, and screening apply.
- `agent-safety-posture`: Slack inbound is interactive (not unattended); Strict/Auto/Dangerous HITL applies; command policy still always denies.
- `customer-docs`: Document inbound Slack setup, mapping, HITL in Slack, and env vars.

## Impact

- `agent/channels/slack.ts` (portable `slackChannel`, Brain auth hooks)
- Slack identity store (MCP Connect callback + lookup)
- Chat store mapping for Slack threads
- `.env.example`, Tools/Slack docs, environment reference, approvals
- Tests for mapping, signature fail-closed, unmapped user drop, posture not unattended
- `pnpm run verify` and `openspec:validate`
