## ADDED Requirements

### Requirement: Slack inbound channel uses portable credentials
The system MUST expose eve's Slack channel on `/eve/v1/slack` using operator-supplied bot token and signing secret. Core inbound Slack MUST remain operable without a Vercel account, Vercel project link, Vercel Connect, or `@vercel/connect`.

#### Scenario: Slack route is reachable without Connect
- **WHEN** Brain is running with `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` set
- **THEN** Slack can deliver Event Subscriptions to `{BRAIN_PUBLIC_URL}/eve/v1/slack` without `vercel link`

#### Scenario: Browser eve channel is unchanged
- **WHEN** a signed-in browser client creates an eve session
- **THEN** that request still requires a Brain session cookie (or internal bearer) and is not authenticated by the Slack signing secret
