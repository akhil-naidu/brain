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
