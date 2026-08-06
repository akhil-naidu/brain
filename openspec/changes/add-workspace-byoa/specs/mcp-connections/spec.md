## MODIFIED Requirements

### Requirement: Host app credentials vs per-user grants
For static-credential MCP connections, Brain MAY store a host-wide OAuth app client id/secret (UI file or env) shared by all users on that host (platform/instance apps). Per-user isolation MUST apply to OAuth access/refresh grants scoped by workspace, not to the shared app registration. Mutating UI-stored host app credentials MUST be limited to the instance admin (host operator).

#### Scenario: Shared app, isolated grants
- **WHEN** the instance admin has configured host app credentials for a connection and user A and user B each complete OAuth in the same workspace
- **THEN** each user has a distinct stored grant and neither grant is usable as the other user’s principal

#### Scenario: Env credentials remain deploy-time fallback
- **WHEN** no UI-stored host or workspace credentials exist for a static-credential connection and the matching env vars are set
- **THEN** Menu Connect can authorize using those env credentials

## ADDED Requirements

### Requirement: Workspace BYOA app credentials
A workspace owner or admin MUST be able to store OAuth app credentials for a static-credential connection scoped to that workspace. Resolve order for app credentials MUST be: workspace BYOA, then host stored, then env, then DCR when applicable. Members MUST NOT mutate BYOA credentials. Clearing BYOA MUST NOT delete host/env credentials or other workspaces’ BYOA.

#### Scenario: Workspace app preferred over host
- **WHEN** workspace W has BYOA credentials for Slack and the host also has Slack credentials
- **THEN** authorize/status resolution for active workspace W uses the workspace BYOA client id

#### Scenario: Workspace admin can save BYOA
- **WHEN** a workspace admin saves Slack client id/secret for the active workspace
- **THEN** those credentials are stored for that workspace only

#### Scenario: Member cannot mutate BYOA
- **WHEN** a workspace member without admin/owner role attempts to save or clear BYOA credentials
- **THEN** the system rejects the mutation
