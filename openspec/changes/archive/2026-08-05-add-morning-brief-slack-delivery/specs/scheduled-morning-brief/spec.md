## MODIFIED Requirements

### Requirement: Local schedule configuration

Brain SHALL persist a morning-brief schedule under `.eve/scheduled-brief.json` with enabled flag, hour, minute, IANA timezone, weekdays-only option, and optional Slack delivery settings (`slackDeliveryEnabled`, `slackChannel`). Operators SHALL be able to read and update this configuration through an HTTP API.

#### Scenario: Save schedule settings

- **WHEN** a client updates the schedule with a valid hour, minute, timezone, and enabled flag
- **THEN** Brain persists those values and subsequent reads return them

#### Scenario: Save Slack delivery settings

- **WHEN** a client enables Slack delivery with a non-empty channel target
- **THEN** Brain persists `slackDeliveryEnabled` and `slackChannel`

## ADDED Requirements

### Requirement: Optional Slack delivery after brief

When Slack delivery is enabled and a channel target is configured, Brain SHALL attempt to post the completed morning-brief text to that Slack destination using the stored Slack OAuth token for the anonymous local chat principal. A Slack delivery failure SHALL NOT fail the chat brief run; Brain SHALL record the error for the schedule UI.

#### Scenario: Successful Slack post

- **WHEN** a brief run completes with assistant text and Slack delivery is enabled with a resolvable channel
- **THEN** Brain posts that brief text to Slack and clears any previous Slack delivery error

#### Scenario: Slack unavailable

- **WHEN** Slack delivery is enabled but Slack is not signed in or the channel cannot be resolved
- **THEN** Brain still persists the brief chat and records a Slack delivery error

### Requirement: Empty-state schedule controls

The empty chat state SHALL expose controls to enable the schedule, set local time, optionally enable Slack delivery with a channel target, run a brief now, and show a host-crontab example that posts a forced run.

#### Scenario: Run now from empty state

- **WHEN** the user chooses Run now from the schedule panel
- **THEN** Brain performs a forced brief run and the UI can open the resulting chat
