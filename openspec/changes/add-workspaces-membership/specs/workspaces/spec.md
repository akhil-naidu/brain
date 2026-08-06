## Purpose

Defines Brain workspaces and membership so users collaborate in isolated tenancy units with roles, a personal workspace, and an active workspace for API and UI scope.

## ADDED Requirements

### Requirement: Workspace is the tenancy unit
The system MUST represent collaboration scope as a workspace with a stable workspace id and display name. Product copy and API naming MUST use “workspace” (not “organization” or “org”).

#### Scenario: Create team workspace
- **WHEN** a signed-in user creates a workspace and instance policy allows workspace creation
- **THEN** the system creates a workspace, makes that user the owner member, and the user can select it as the active workspace

### Requirement: Personal workspace provisioning
When instance policy enables auto personal workspaces, the system MUST ensure each user has a Personal workspace they own. Bootstrap of the first user MUST result in at least one workspace membership for that user.

#### Scenario: New user gets personal workspace
- **WHEN** a user account is created and auto personal workspace policy is enabled
- **THEN** that user has a Personal workspace membership with owner role before they use chat APIs

### Requirement: Membership roles
The system MUST support workspace membership roles of at least owner, admin, and member. Only members of a workspace MAY access that workspace’s scoped resources according to other capabilities.

#### Scenario: Non-member denied
- **WHEN** a signed-in user who is not a member of workspace W requests workspace-scoped data for W
- **THEN** the system rejects the request without leaking W’s contents

### Requirement: Active workspace
Authenticated sessions MUST have an active workspace id that is a workspace the user belongs to. The system MUST allow the user to switch the active workspace among their memberships. Protected chat, playbook, schedule, and connection grant operations MUST use the active workspace unless an API explicitly targets another membership-checked workspace id.

#### Scenario: Switch workspace
- **WHEN** a signed-in user switches the active workspace to another workspace they belong to
- **THEN** subsequent sidebar chat lists and connection status reflect that workspace’s scoped data for that user

#### Scenario: Active workspace required
- **WHEN** a signed-in user has no resolvable active workspace membership
- **THEN** the system MUST NOT serve workspace-scoped resources until an active workspace is established
