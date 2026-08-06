## Purpose

Run saved playbook prompts on a host schedule into a persisted chat, with optional Slack delivery.

## Requirements

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

### Requirement: Schedule controls in chat chrome

The chat UI SHALL let the user manage playbook schedules from a composer Schedules control available during any chat (including empty chat). Schedules SHALL open as an inline panel above the composer, with a Manage control that opens a dedicated `/schedules` page. The chat sidebar MUST show a short playbook-schedules preview and a Manage/View more control that opens `/schedules`. Those controls SHALL let the user add a schedule from a saved playbook, enable/disable it, set time and optional Slack channel, run it now, and open the last chat for that schedule. The empty chat state MUST NOT duplicate the full playbook schedules panel.

#### Scenario: Open playbook schedules from the composer

- **WHEN** the user opens Schedules from the composer
- **THEN** the UI shows playbook schedule controls

#### Scenario: Run now from Schedules

- **WHEN** the user chooses Run now for a playbook schedule from Schedules
- **THEN** Brain performs a forced run and the UI can open the resulting chat

### Requirement: Show last-run status

Each playbook schedule in Schedules MUST show a short last-run status (for example “Not run yet” or when it last ran) and, when a last chat exists, a control to open that chat.

#### Scenario: Last run shown

- **WHEN** a playbook schedule has a recorded last run time
- **THEN** the Schedules UI shows when it last ran in plain language

### Requirement: Pause and resume all schedules

Schedules MUST offer Pause all, which disables the morning brief and every playbook schedule that is currently enabled, and remembers those choices for Resume. Resume MUST restore only the schedules that were enabled when Pause all was used.

#### Scenario: Pause all automatic runs

- **WHEN** the user chooses Pause all while at least one schedule is enabled
- **THEN** those schedules become disabled and automatic runs stop until the user enables them again or chooses Resume

#### Scenario: Resume after pause

- **WHEN** the user chooses Resume after Pause all
- **THEN** the schedules that were enabled at pause time become enabled again
