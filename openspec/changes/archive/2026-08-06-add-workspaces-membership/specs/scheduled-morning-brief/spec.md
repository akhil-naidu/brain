## MODIFIED Requirements

### Requirement: Per-user morning brief schedule configuration

Brain SHALL persist a morning-brief schedule **per workspace** in host durable storage with enabled flag, hour, minute, IANA timezone, weekdays-only option, optional Slack delivery settings (`slackDeliveryEnabled`, `slackChannel`), and a run-as user id. Workspace members SHALL read and update the active workspace’s configuration through an authenticated HTTP API.

#### Scenario: Save schedule settings

- **WHEN** a signed-in workspace member updates the active workspace brief schedule with a valid hour, minute, timezone, and enabled flag
- **THEN** Brain persists those values for that workspace and subsequent reads by members of that workspace return them

#### Scenario: Save Slack delivery settings

- **WHEN** a signed-in workspace member enables Slack delivery with a non-empty channel target for the active workspace
- **THEN** Brain persists `slackDeliveryEnabled` and `slackChannel` for that workspace

### Requirement: Deliver brief into a chat for the owning user

When a brief run is executed for a workspace, Brain SHALL create a new persisted chat owned by the schedule’s run-as user in that workspace, start an eve session as that user using the morning-brief prompt, and store the session plus stream events on that chat.

#### Scenario: Forced run creates a chat

- **WHEN** a signed-in workspace member requests a forced brief run for the active workspace
- **THEN** Brain creates a chat for the run-as user in that workspace, runs the morning-brief prompt as that user, and returns the chat id

#### Scenario: Due run skips after success the same local day

- **WHEN** a non-forced run is requested after a successful run already recorded for the schedule’s local calendar day
- **THEN** Brain skips starting another brief and reports that it was not due
