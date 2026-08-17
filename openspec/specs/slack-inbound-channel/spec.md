# slack-inbound-channel Specification

## Purpose

Lets signed-in Brain users talk to the same governed Agent from Slack DMs and @mentions, with fail-closed identity mapping and Slack HITL, without Vercel Connect.

## Requirements

### Requirement: Slack Events webhook is signature-verified
The system MUST accept Slack Events API and interactivity callbacks on the agent's Slack channel route under `/eve/v1/slack` on the public Brain origin. Inbound requests MUST be verified with the Slack signing secret. Unverified requests MUST be rejected and MUST NOT start a turn.

#### Scenario: Valid signed event is accepted
- **WHEN** Slack POSTs a signed `app_mention` or `message.im` event to `/eve/v1/slack`
- **THEN** the request is acknowledged and eligible for dispatch after identity mapping

#### Scenario: Unsigned or bad-signature request is rejected
- **WHEN** a client POSTs to `/eve/v1/slack` without a valid Slack signature
- **THEN** the system does not start an agent turn

#### Scenario: URL verification challenge succeeds
- **WHEN** Slack sends a `url_verification` payload with a valid signature
- **THEN** the system returns the challenge so Event Subscriptions can be enabled

### Requirement: Portable bot credentials not Vercel Connect
Slack inbound MUST authenticate to Slack with a bot token and signing secret supplied by the operator (environment variables `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`, or instance-stored equivalents). The system MUST NOT require `@vercel/connect`, `connectSlackCredentials`, a Vercel project, or `vercel link` for inbound Slack.

#### Scenario: Host with env bot credentials can receive DMs
- **WHEN** `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` are set and a mapped user DMs the Brain bot
- **THEN** the agent can reply in that DM without Vercel Connect

#### Scenario: Missing bot credentials do not use Connect
- **WHEN** bot token and signing secret are unset
- **THEN** inbound Slack is unavailable and the system does not fall back to Vercel Connect

### Requirement: DMs and mentions dispatch; unmentioned channel noise does not
The system MUST start or continue an Agent turn for (1) a DM to the Brain bot from a mapped human, and (2) an `@mention` of the Brain bot in a channel the bot can see. Follow-up messages in a Slack thread that already has an active Brain session MUST continue that session without requiring another mention. Channel messages that neither mention the bot nor belong to an active Brain thread MUST be ignored. Messages authored by the Brain bot MUST be ignored.

#### Scenario: Mapped user DMs the bot
- **WHEN** a mapped Brain user sends a DM to the Brain Slack app
- **THEN** Brain runs an Agent turn as that user and replies in the DM

#### Scenario: Mapped user @mentions the bot
- **WHEN** a mapped Brain user @mentions the Brain bot in a channel
- **THEN** Brain runs an Agent turn as that user and replies in that thread

#### Scenario: Reply in an active thread continues
- **WHEN** a mapped user replies in a Slack thread that already has an active Brain session
- **THEN** that reply continues the same session without requiring another @mention

#### Scenario: Unmentioned channel message is ignored
- **WHEN** a channel message does not mention the bot and the thread has no active Brain session
- **THEN** the system does not start a turn

### Requirement: Optional channel allowlist for mentions
When an allowlist of Slack channel ids is configured (instance-stored or `SLACK_INBOUND_CHANNEL_IDS`), the system MUST start Agent turns for @mentions and active-thread follow-ups only in those channels. Direct messages MUST still dispatch. When no allowlist is stored and the env var is unset, mentions MUST work in every channel the bot can see. A stored empty list MUST mean unrestricted and MUST override env. Denied channels MUST NOT start a turn and MUST NOT post a refusal.

#### Scenario: Unrestricted default
- **WHEN** no stored allowlist exists and `SLACK_INBOUND_CHANNEL_IDS` is unset
- **THEN** a mapped user @mention in any channel the bot can see can start a turn

#### Scenario: Stored empty list overrides env
- **WHEN** the host has stored `allowedChannelIds` as an empty list and env names channel ids
- **THEN** mentions are not restricted by that env list

#### Scenario: Mention outside the allowlist is ignored
- **WHEN** a non-empty allowlist is configured and a mapped user @mentions the bot in a channel that is not on the list
- **THEN** the system does not start a turn and does not post a refusal

#### Scenario: DM still works with an allowlist
- **WHEN** a non-empty allowlist is configured and a mapped user DMs the bot
- **THEN** Brain still runs an Agent turn as that user

#### Scenario: Leftover thread outside the list is ignored
- **WHEN** a Slack thread already has an active Brain session and the operator then restricts inbound to other channels
- **THEN** follow-ups in the excluded channel do not start a turn

### Requirement: Slack actor maps to a Brain user or the turn is dropped
The system MUST map the Slack user id (and Slack team id) to exactly one Brain user before starting a turn. Primary mapping MUST use Slack user/team ids stored when that user completed Slack MCP Connect. If no stored id matches, the system MAY map by the Slack profile email when it uniquely matches a Brain account email. If mapping fails or is ambiguous, the system MUST NOT run as anonymous, MUST NOT use another user's principal, MUST NOT start the turn, and MUST send a private reply telling the Slack user to sign in to Brain and Connect Slack.

#### Scenario: Connected Slack user is mapped
- **WHEN** user A has completed Slack MCP Connect and Slack user U in team T DMs the bot
- **THEN** the turn runs as user A's Brain principal in a workspace where A has a Slack grant

#### Scenario: Unmapped Slack user is refused
- **WHEN** Slack user U has no stored mapping and no unique Brain email match
- **THEN** no agent turn starts and U receives a private message with a Brain Connect Slack link

#### Scenario: Anonymous principal is never used
- **WHEN** inbound Slack would otherwise lack a Brain user
- **THEN** the session principal is not `anonymous` and no other user's MCP grants are used

### Requirement: Slack turns are interactive Agent with Slack HITL
Inbound Slack turns MUST run in Agent mode, MUST use the instance agent safety posture (not unattended Auto-HITL), MUST apply command policy, and MUST apply Auto/Strict tool-result screening. HITL pauses MUST be completable from Slack (approve/deny controls in the thread), not only from the Brain browser.

#### Scenario: Auto write waits in Slack
- **WHEN** instance posture is `auto` and a Slack Agent turn calls a mutating connection tool the command policy allows
- **THEN** the call waits for the mapped user to approve or deny from Slack

#### Scenario: Slack is not treated as a schedule
- **WHEN** instance posture is `strict` and a Slack Agent turn calls a reviewed read connection tool
- **THEN** the call requires HITL (it is not skipped as unattended)

#### Scenario: Command policy still denies from Slack
- **WHEN** a Slack Agent turn calls bash with `rm -rf /tmp/workspace`
- **THEN** the call is denied, does not execute, and does not become an approve prompt

#### Scenario: Another Slack user cannot approve the turn
- **WHEN** a HITL prompt is showing in a Slack thread for user A's session and Slack user V (mapped to a different Brain user, or unmapped) clicks Approve
- **THEN** the tool does not execute as user A and the click is ignored or refused

### Requirement: `/new` starts a fresh Slack conversation
When a mapped user sends `/new` as the message text in a DM or in an active Brain Slack thread, the system MUST retire the current session for that thread and MUST NOT send `/new` to the model as a user prompt.

#### Scenario: User resets a DM
- **WHEN** a mapped user sends `/new` in a Brain bot DM that has an active session
- **THEN** the next message starts a new session and `/new` is not treated as a model prompt
