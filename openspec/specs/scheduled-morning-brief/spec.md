## Purpose

Deliver Brain’s morning brief into a persisted chat on a local schedule while the host is running, with optional Slack delivery.

## Requirements

### Requirement: Local schedule configuration

Brain SHALL persist a morning-brief schedule under `.eve/scheduled-brief.json` with enabled flag, hour, minute, IANA timezone, weekdays-only option, and optional Slack delivery settings (`slackDeliveryEnabled`, `slackChannel`). Operators SHALL be able to read and update this configuration through an HTTP API.

#### Scenario: Save schedule settings

- **WHEN** a client updates the schedule with a valid hour, minute, timezone, and enabled flag
- **THEN** Brain persists those values and subsequent reads return them

#### Scenario: Save Slack delivery settings

- **WHEN** a client enables Slack delivery with a non-empty channel target
- **THEN** Brain persists `slackDeliveryEnabled` and `slackChannel`

### Requirement: Deliver brief into a chat

When a brief run is executed, Brain SHALL create a new persisted chat titled for that morning brief, start an eve session using the morning-brief prompt, and store the session plus stream events on that chat.

#### Scenario: Forced run creates a chat

- **WHEN** a client requests a forced brief run
- **THEN** Brain creates a chat, runs the morning-brief prompt, and returns the chat id

#### Scenario: Due run skips after success the same local day

- **WHEN** a non-forced run is requested after a successful run already recorded for the schedule’s local calendar day
- **THEN** Brain skips starting another brief and reports that it was not due

### Requirement: Optional Slack delivery after brief

When Slack delivery is enabled and a channel target is configured, Brain SHALL attempt to post the completed morning-brief text to that Slack destination using the stored Slack OAuth token for the anonymous local chat principal. A Slack delivery failure SHALL NOT fail the chat brief run; Brain SHALL record the error for the schedule UI.

#### Scenario: Successful Slack post

- **WHEN** a brief run completes with assistant text and Slack delivery is enabled with a resolvable channel
- **THEN** Brain posts that brief text to Slack and clears any previous Slack delivery error

#### Scenario: Slack unavailable

- **WHEN** Slack delivery is enabled but Slack is not signed in or the channel cannot be resolved
- **THEN** Brain still persists the brief chat and records a Slack delivery error

### Requirement: Automatic dispatch while production eve runs

Brain SHALL define an eve schedule that checks approximately every minute and triggers a non-forced brief run against the Next API when the configured schedule is enabled and due.

#### Scenario: Production tick when due

- **WHEN** production eve is running, the schedule is enabled, and the local time matches the configured minute
- **THEN** Brain starts at most one brief chat for that local calendar day

### Requirement: Schedule controls in chat chrome

The chat UI SHALL expose morning-brief schedule controls from a composer Schedules control available during any chat (including empty chat). Those controls SHALL let the user enable the schedule, set local time, optionally enable Slack delivery with a channel target, and run a brief now. The schedule UI MUST NOT show host crontab, curl, or other operator setup commands. The empty chat state MUST NOT duplicate the full morning-brief schedule panel.

#### Scenario: Open schedules from the composer

- **WHEN** the user opens Schedules from the composer
- **THEN** the UI shows the morning-brief schedule controls

#### Scenario: Run now from Schedules

- **WHEN** the user chooses Run now from Schedules
- **THEN** Brain performs a forced brief run and the UI can open the resulting chat

### Requirement: Show last-run status

The morning-brief schedule controls MUST show a short last-run status and, when a last chat exists, a control to open that chat.

#### Scenario: Last run shown

- **WHEN** the morning brief has a recorded last run time
- **THEN** the Schedules UI shows when it last ran in plain language

### Requirement: Included in Pause all

Pause all in Schedules MUST disable the morning brief when it is enabled, and Resume MUST restore it when it was enabled at pause time.

#### Scenario: Pause disables morning brief

- **WHEN** the morning brief schedule is enabled and the user chooses Pause all
- **THEN** the morning brief schedule becomes disabled
