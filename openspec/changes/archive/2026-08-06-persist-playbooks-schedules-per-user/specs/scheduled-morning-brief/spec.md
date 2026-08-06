## MODIFIED Requirements

### Requirement: Per-user morning brief schedule configuration
Brain SHALL persist a morning-brief schedule per signed-in user in host durable storage with enabled flag, hour, minute, IANA timezone, weekdays-only option, and optional Slack delivery settings (`slackDeliveryEnabled`, `slackChannel`). Users SHALL read and update only their own configuration through an authenticated HTTP API.

#### Scenario: Save schedule settings
- **WHEN** a signed-in user updates their schedule with a valid hour, minute, timezone, and enabled flag
- **THEN** Brain persists those values for that user and subsequent reads by that user return them

### Requirement: Deliver brief into a chat for the owning user
When a brief run is executed for a user, Brain SHALL create a new persisted chat owned by that user, start an eve session as that user using the morning-brief prompt, and store the session plus stream events on that chat.

#### Scenario: Forced run creates a chat
- **WHEN** a signed-in user requests a forced brief run
- **THEN** Brain creates a chat for that user, runs the morning-brief prompt as that user, and returns the chat id

### Requirement: Optional Slack delivery after brief
When Slack delivery is enabled and a channel target is configured, Brain SHALL attempt to post the completed morning-brief text using the stored Slack OAuth token for the **owning user’s** principal. A Slack delivery failure SHALL NOT fail the chat brief run; Brain SHALL record the error for the schedule UI.

#### Scenario: Successful Slack post
- **WHEN** a brief run completes with assistant text and Slack delivery is enabled with a resolvable channel for that user
- **THEN** Brain posts that brief text to Slack using that user’s token and clears any previous Slack delivery error
