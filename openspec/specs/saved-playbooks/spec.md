## Purpose

Lets users save named reusable prompts (playbooks) in the browser and run them from empty chat or the composer.

## Requirements

### Requirement: Persist playbooks in the browser
The system MUST let the user save named playbooks (label + prompt text) in browser-local storage on the Brain host’s chat UI, without requiring a login or cloud database.

#### Scenario: Save a playbook
- **WHEN** the user creates a playbook with a name and prompt
- **THEN** it is stored locally and available after refresh in that browser

#### Scenario: Delete a playbook
- **WHEN** the user deletes a playbook
- **THEN** it is removed from local storage and no longer listed

### Requirement: Run a playbook as a chat turn
Activating a playbook MUST send its prompt through the same path as a normal composer submit.

#### Scenario: Run from empty state
- **WHEN** the user activates a playbook in the empty-state list
- **THEN** the system sends that playbook’s prompt as a new turn

#### Scenario: Run from composer menu
- **WHEN** the user activates a playbook from the composer playbooks menu
- **THEN** the system sends that playbook’s prompt as a new turn

### Requirement: Manage playbooks from chat chrome
The empty chat state and composer MUST provide ways to add and edit playbooks. The empty state MUST show saved playbooks separately from built-in welcome suggestions.

#### Scenario: Empty state shows personal playbooks
- **WHEN** the thread is empty and chat send is available
- **THEN** the UI shows a Your playbooks section distinct from Try asking suggestions

### Requirement: Schedule a playbook in one step
When schedules are available, the playbooks list and composer playbooks menu MUST let the user schedule a saved playbook with one action. That action MUST create a weekday morning schedule from the playbook prompt (or open Schedules if that playbook is already scheduled), without requiring the Schedules add form first.

#### Scenario: Schedule from playbooks list
- **WHEN** the user chooses Schedule on a saved playbook that is not already scheduled
- **THEN** Brain creates an enabled weekday schedule for that playbook and opens Schedules so the user can adjust it
