## Purpose

Run saved playbook prompts on a host schedule into a persisted chat, with optional Slack delivery.

## Requirements

### Requirement: Persist playbook schedules on the host

Brain SHALL persist zero or more playbook schedules under `.eve/scheduled-playbooks.json`, each with a label, prompt snapshot, daily time settings, optional Slack delivery, and last-run markers. Brain SHALL cap the number of schedules at a small fixed limit.

#### Scenario: Create a schedule from a playbook

- **WHEN** a client creates a schedule with a label, prompt, and valid daily time settings
- **THEN** Brain stores that schedule and subsequent list reads include it

### Requirement: Run a scheduled playbook into a chat

When a playbook schedule runs, Brain SHALL create a new persisted chat titled from the schedule label and date, start an eve session with the stored prompt, and store session events on that chat. Optional Slack delivery SHALL use the same soft-fail behavior as the morning brief.

#### Scenario: Forced run

- **WHEN** a client requests a forced run for a schedule id
- **THEN** Brain creates a chat, runs the stored prompt, and returns the chat id

#### Scenario: Due run once per local day

- **WHEN** a non-forced due check finds an enabled schedule whose local time matches and that has not already succeeded that local day
- **THEN** Brain runs that schedule at most once for that local day

### Requirement: Schedule controls in chat chrome

The chat UI SHALL let the user manage playbook schedules from a composer Schedules control available during any chat (including empty chat). Those controls SHALL let the user add a schedule from a saved playbook, enable/disable it, set time and optional Slack channel, run it now, and open the last chat for that schedule. The empty chat state MUST NOT duplicate the full playbook schedules panel.

#### Scenario: Open playbook schedules from the composer

- **WHEN** the user opens Schedules from the composer
- **THEN** the UI shows playbook schedule controls

#### Scenario: Run now from Schedules

- **WHEN** the user chooses Run now for a playbook schedule from Schedules
- **THEN** Brain performs a forced run and the UI can open the resulting chat
