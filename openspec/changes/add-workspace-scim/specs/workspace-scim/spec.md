## Purpose

Let team workspace admins expose a SCIM 2.0 endpoint so identity providers can provision and deprovision members of that workspace.

## ADDED Requirements

### Requirement: Workspace admin manages SCIM token
A team workspace owner or admin MUST be able to create, view connection metadata for, and revoke a SCIM bearer token for that workspace when the SSO license entitlement allows SCIM. Personal workspaces MUST NOT expose SCIM. Members who are not owner/admin MUST NOT manage tokens.

#### Scenario: Admin generates token
- **WHEN** a workspace admin requests a new SCIM token for a team workspace and SSO is licensed
- **THEN** the system returns a bearer token once and a SCIM base URL for the IdP

#### Scenario: Member denied
- **WHEN** a workspace member attempts to generate a SCIM token
- **THEN** the system rejects the request

### Requirement: SCIM provisions workspace membership
When an IdP creates a user through a workspace SCIM token, Brain MUST create or link a user account and ensure that user is a member of the token’s workspace (default role member).

#### Scenario: New user provisioned
- **WHEN** SCIM creates a user with a valid workspace SCIM bearer token
- **THEN** a Brain user exists and is a member of that workspace

### Requirement: SCIM deprovisions workspace membership
When an IdP deletes or deactivates a user through a workspace SCIM token, Brain MUST remove that user’s membership in the token’s workspace when safe (MUST NOT remove the last workspace owner).

#### Scenario: Member removed via SCIM
- **WHEN** SCIM deletes a provisioned member who is not the last owner
- **THEN** that user loses membership in the workspace
