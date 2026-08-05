## ADDED Requirements

### Requirement: Local schedule configuration

Brain SHALL persist a morning-brief schedule under `.eve/scheduled-brief.json` with enabled flag, hour, minute, IANA timezone, and weekdays-only option. Operators SHALL be able to read and update this configuration through an HTTP API.

#### Scenario: Save schedule settings

- **WHEN** a client updates the schedule with a valid hour, minute, timezone, and enabled flag
- **THEN** Brain persists those values and subsequent reads return them

### Requirement: Deliver brief into a chat

When a brief run is executed, Brain SHALL create a new persisted chat titled for that morning brief, start an eve session using the morning-brief prompt, and store the session plus stream events on that chat.

#### Scenario: Forced run creates a chat

- **WHEN** a client requests a forced brief run
- **THEN** Brain creates a chat, runs the morning-brief prompt, and returns the chat id

#### Scenario: Due run skips after success the same local day

- **WHEN** a non-forced run is requested after a successful run already recorded for the schedule’s local calendar day
- **THEN** Brain skips starting another brief and reports that it was not due

### Requirement: Automatic dispatch while production eve runs

Brain SHALL define an eve schedule that checks approximately every minute and triggers a non-forced brief run against the Next API when the configured schedule is enabled and due.

#### Scenario: Production tick when due

- **WHEN** production eve is running, the schedule is enabled, and the local time matches the configured minute
- **THEN** Brain starts at most one brief chat for that local calendar day

### Requirement: Empty-state schedule controls

The empty chat state SHALL expose controls to enable the schedule, set local time, run a brief now, and show a host-crontab example that posts a forced run.

#### Scenario: Run now from empty state

- **WHEN** the user chooses Run now from the schedule panel
- **THEN** Brain performs a forced brief run and the UI can open the resulting chat
