## Purpose

Lets signed-in users save named reusable prompts (playbooks) on the Brain host and run them from empty chat or the composer.
## Requirements
### Requirement: Persist playbooks for the signed-in user
The system MUST let a signed-in user save named playbooks (label + prompt text) on the Brain host in durable storage scoped to the **active workspace** (shared library for all members of that workspace). The system MUST NOT use browser-local storage as the source of truth after the user is signed in. Unauthenticated callers MUST NOT read or mutate playbooks. Callers MUST be members of the workspace.

#### Scenario: Save a playbook
- **WHEN** a signed-in user with an active workspace creates a playbook with a name and prompt
- **THEN** it is stored on the host for that workspace and available after refresh to members of that workspace

#### Scenario: Delete a playbook
- **WHEN** a signed-in workspace member deletes a playbook in the active workspace
- **THEN** it is removed from that workspace’s host store and no longer listed for that workspace

#### Scenario: Unauthenticated access denied
- **WHEN** a client without a valid session requests the playbooks collection
- **THEN** the system rejects the request

#### Scenario: Users are isolated
- **WHEN** user A has playbooks only in workspace W and user B is not a member of W
- **THEN** user B does not receive those playbooks

#### Scenario: Workspaces are isolated
- **WHEN** workspace A has playbooks and a user lists playbooks with active workspace B
- **THEN** the list does not include workspace A’s playbooks

#### Scenario: Members see shared playbooks
- **WHEN** user A saves a playbook in workspace W and user B is a member of W with W active
- **THEN** user B’s playbook list includes that playbook

### Requirement: Optional one-time import from browser storage
When a signed-in user’s host playbook list is empty, the chat UI MAY offer or automatically perform a one-time import of legacy browser-local playbooks into that user’s host store, then MUST stop treating browser storage as authoritative.

#### Scenario: Import legacy local playbooks
- **WHEN** the signed-in user has no host playbooks and the browser still has legacy playbooks
- **THEN** those playbooks are copied into the host store for that user and subsequent reads use the host store

### Requirement: Run a playbook as a chat turn
Activating a playbook MUST send its prompt through the same path as a normal composer submit.

#### Scenario: Run from empty state
- **WHEN** the user activates a playbook in the empty-state list
- **THEN** the system sends that playbook’s prompt as a new turn

#### Scenario: Run from composer menu
- **WHEN** the user activates a playbook from the composer playbooks menu
- **THEN** the system sends that playbook’s prompt as a new turn

### Requirement: Manage playbooks from chat chrome
The empty chat state and composer MUST provide ways to add and edit playbooks. The empty state MUST show saved playbooks separately from built-in welcome suggestions. The composer playbooks menu and empty-state playbooks section MUST offer a Manage control that opens a dedicated `/playbooks` page for roomier add/edit/delete. The chat sidebar MUST show a short playbooks preview list and a Manage/View more control that opens `/playbooks`. Running a playbook from the sidebar or manage page MUST continue in chat.

#### Scenario: Empty state shows personal playbooks
- **WHEN** the thread is empty and chat send is available
- **THEN** the UI shows a Your playbooks section distinct from Try asking suggestions

#### Scenario: Open manage page from composer menu
- **WHEN** the user chooses Manage from the composer playbooks menu
- **THEN** the UI opens the `/playbooks` page

#### Scenario: Run from manage page
- **WHEN** the user runs a playbook from `/playbooks`
- **THEN** Brain opens chat and sends that playbook’s prompt as a new turn

### Requirement: Schedule a playbook in one step
When schedules are available, the playbooks list and composer playbooks menu MUST let the user schedule a saved playbook with one action. That action MUST ask for a local time (remembering the last chosen time), then create an enabled weekday schedule from the playbook prompt (or open Schedules if that playbook is already scheduled), without requiring the Schedules add form first.

#### Scenario: Schedule from playbooks list
- **WHEN** the user chooses Schedule on a saved playbook that is not already scheduled and confirms a local time
- **THEN** Brain creates an enabled weekday schedule for that playbook at that time and opens Schedules so the user can adjust it

