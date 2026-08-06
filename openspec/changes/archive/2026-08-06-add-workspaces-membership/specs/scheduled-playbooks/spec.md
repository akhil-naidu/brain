## MODIFIED Requirements

### Requirement: Persist playbook schedules per signed-in user

Brain SHALL persist zero or more playbook schedules in host durable storage scoped to the **active workspace**, each with a label, prompt snapshot, daily time settings, optional Slack delivery, last-run markers, and a run-as user id (workspace member whose principal/MCP grants are used). Brain SHALL cap the number of schedules per workspace at a small fixed limit. Unauthenticated callers MUST NOT read or mutate schedules. Callers MUST be members of the workspace.

#### Scenario: Create a schedule from a playbook

- **WHEN** a signed-in workspace member creates a schedule with a label, prompt, and valid daily time settings in the active workspace
- **THEN** Brain stores that schedule for that workspace and subsequent list reads by members of that workspace include it

#### Scenario: Users are isolated

- **WHEN** user A has schedules only in workspace W and user B is not a member of W
- **THEN** user B’s schedule list does not include those schedules

#### Scenario: Workspaces are isolated

- **WHEN** workspace A has schedules and a user lists schedules with active workspace B
- **THEN** the list does not include workspace A’s schedules

### Requirement: Run a scheduled playbook as the owning user

When a playbook schedule runs, Brain SHALL create a new persisted chat owned by the schedule’s run-as user id **in that schedule’s workspace**, start an eve session as that user principal with the stored prompt, and store session events on that chat. Optional Slack delivery SHALL use that user’s stored Slack OAuth token for that workspace with the same soft-fail behavior as the morning brief.

#### Scenario: Forced run

- **WHEN** a signed-in workspace member requests a forced run for one of that workspace’s schedule ids
- **THEN** Brain creates a chat for the run-as user in that workspace, runs the stored prompt as that user, and returns the chat id

#### Scenario: Due run once per local day

- **WHEN** a non-forced due check finds an enabled schedule whose local time matches and that has not already succeeded that local day
- **THEN** Brain runs that schedule at most once for that local day as the run-as user in that workspace
