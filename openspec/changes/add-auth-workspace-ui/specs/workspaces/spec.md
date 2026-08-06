## Purpose

Workspaces are the tenancy unit. Users list, create, and switch active workspace for scoped chats and connections.

## ADDED Requirements

### Requirement: List and switch workspaces
A signed-in user MUST be able to list workspaces they belong to and set one as active. Switching MUST persist server-side and scope subsequent API calls to that workspace.

#### Scenario: Switch active workspace
- **WHEN** a member selects another workspace they belong to
- **THEN** that workspace becomes active for following requests

### Requirement: Create team workspace
When instance policy allows create-workspace, a signed-in user MUST be able to create a team workspace, become its owner, and have it set active.

#### Scenario: Create succeeds
- **WHEN** create-workspace is allowed and the user creates a named team workspace
- **THEN** the workspace exists with the creator as owner and is active
