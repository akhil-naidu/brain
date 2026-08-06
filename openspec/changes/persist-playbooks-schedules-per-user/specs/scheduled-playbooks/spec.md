## MODIFIED Requirements

### Requirement: Persist playbook schedules per signed-in user
Brain SHALL persist zero or more playbook schedules in host durable storage scoped to the signed-in user’s id, each with a label, prompt snapshot, daily time settings, optional Slack delivery, and last-run markers. Brain SHALL cap the number of schedules per user at a small fixed limit. Unauthenticated callers MUST NOT read or mutate schedules.

#### Scenario: Create a schedule from a playbook
- **WHEN** a signed-in user creates a schedule with a label, prompt, and valid daily time settings
- **THEN** Brain stores that schedule for that user and subsequent list reads by that user include it

#### Scenario: Users are isolated
- **WHEN** user A has schedules and user B lists schedules
- **THEN** user B does not receive user A’s schedules

### Requirement: Run a scheduled playbook as the owning user
When a playbook schedule runs, Brain SHALL create a new persisted chat owned by the schedule’s user id, start an eve session as that user principal with the stored prompt, and store session events on that chat. Optional Slack delivery SHALL use that user’s stored Slack OAuth token with the same soft-fail behavior as the morning brief.

#### Scenario: Forced run
- **WHEN** a signed-in user requests a forced run for one of their schedule ids
- **THEN** Brain creates a chat for that user, runs the stored prompt as that user, and returns the chat id

#### Scenario: Due run once per local day
- **WHEN** a non-forced due check finds an enabled schedule whose local time matches and that has not already succeeded that local day
- **THEN** Brain runs that schedule at most once for that local day as the owning user
