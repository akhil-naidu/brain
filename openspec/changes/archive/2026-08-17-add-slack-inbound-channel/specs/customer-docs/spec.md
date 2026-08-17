## ADDED Requirements

### Requirement: Docs describe Slack inbound
Customer documentation MUST describe how to enable Slack as an inbound channel: Event Subscriptions URL `{BRAIN_PUBLIC_URL}/eve/v1/slack`, bot token and signing secret (not Vercel Connect), that users must have a Brain account and Connect Slack (or a unique email match), that DMs and @mentions start Agent turns, that HITL appears as Slack buttons, and that unmapped users are refused.

#### Scenario: Operator reads Slack connection docs
- **WHEN** a visitor opens the Slack connection documentation page
- **THEN** the page documents inbound Event Subscriptions, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and that Vercel Connect is not used

#### Scenario: User reads approvals docs
- **WHEN** a visitor opens the approvals documentation page
- **THEN** the page states that Slack inbound HITL is approved or denied in Slack and uses instance posture (not schedule unattended rules)
