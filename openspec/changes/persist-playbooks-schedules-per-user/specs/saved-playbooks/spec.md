## MODIFIED Requirements

### Requirement: Persist playbooks for the signed-in user
The system MUST let a signed-in user save named playbooks (label + prompt text) on the Brain host in durable storage scoped to that user’s id. The system MUST NOT use browser-local storage as the source of truth after the user is signed in. Unauthenticated callers MUST NOT read or mutate playbooks.

#### Scenario: Save a playbook
- **WHEN** a signed-in user creates a playbook with a name and prompt
- **THEN** it is stored on the host for that user and available after refresh from any browser signed in as that user

#### Scenario: Delete a playbook
- **WHEN** a signed-in user deletes a playbook
- **THEN** it is removed from that user’s host store and no longer listed for them

#### Scenario: Unauthenticated access denied
- **WHEN** a client without a valid session requests the playbooks collection
- **THEN** the system rejects the request

#### Scenario: Users are isolated
- **WHEN** user A has playbooks and user B lists playbooks
- **THEN** user B does not receive user A’s playbooks

## ADDED Requirements

### Requirement: Optional one-time import from browser storage
When a signed-in user’s host playbook list is empty, the chat UI MAY offer or automatically perform a one-time import of legacy browser-local playbooks into that user’s host store, then MUST stop treating browser storage as authoritative.

#### Scenario: Import legacy local playbooks
- **WHEN** the signed-in user has no host playbooks and the browser still has legacy playbooks
- **THEN** those playbooks are copied into the host store for that user and subsequent reads use the host store
