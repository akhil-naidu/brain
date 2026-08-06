## MODIFIED Requirements

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

#### Scenario: Workspaces are isolated
- **WHEN** workspace A has playbooks and a user lists playbooks with active workspace B
- **THEN** the list does not include workspace A’s playbooks

#### Scenario: Members see shared playbooks
- **WHEN** user A saves a playbook in workspace W and user B is a member of W with W active
- **THEN** user B’s playbook list includes that playbook
