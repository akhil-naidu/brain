## Purpose

Defines Brain's official MCP connections (ClickUp, Slack, Asana, Gmail) and how OAuth credentials are obtained for user-scoped tool access without Vercel Connect.
## Requirements
### Requirement: ClickUp MCP connection with dynamic client registration
The system MUST provide a ClickUp MCP connection using the official ClickUp MCP endpoint and OAuth with dynamic client registration. ClickUp MUST NOT require static client id/secret env vars.

#### Scenario: ClickUp connection is defined
- **WHEN** the agent loads connections
- **THEN** a ClickUp MCP connection is available for task/workspace tools via interactive OAuth / DCR

### Requirement: Slack MCP connection with env client credentials
The system MUST provide a Slack MCP connection using official Slack MCP. App credentials MUST be resolvable from UI-stored host credentials or `SLACK_MCP_CLIENT_ID` / `SLACK_MCP_CLIENT_SECRET`, with stored credentials preferred.

#### Scenario: Slack authorize needs registered redirect
- **WHEN** a user starts Slack MCP authorization
- **THEN** the system produces an authorize URL / redirect URI the operator can register on the Slack app

#### Scenario: Slack accepts UI-stored app credentials
- **WHEN** Slack app id and secret are saved via Set up and env vars are unset
- **THEN** Menu Connect and mid-turn OAuth can authorize Slack without requiring those env vars

### Requirement: Asana MCP connection with env client credentials
The system MUST provide an Asana MCP connection using official Asana MCP. App credentials MUST be resolvable from UI-stored host credentials or `ASANA_MCP_CLIENT_ID` / `ASANA_MCP_CLIENT_SECRET`, with stored credentials preferred.

#### Scenario: Asana connection is defined
- **WHEN** the agent loads connections
- **THEN** an Asana MCP connection is available via interactive OAuth with stored or env client credentials

### Requirement: Gmail MCP connection with Google OAuth client
The system MUST provide a Gmail MCP connection using official Gmail MCP. App credentials MUST be resolvable from UI-stored host credentials or `GOOGLE_MCP_CLIENT_ID` / `GOOGLE_MCP_CLIENT_SECRET`, with stored credentials preferred.

#### Scenario: Gmail connection is defined
- **WHEN** the agent loads connections
- **THEN** a Gmail MCP connection is available via interactive OAuth with stored or Google env client credentials

### Requirement: Connections use self-hosted OAuth not Vercel Connect
MCP connection OAuth MUST be implemented with self-hosted interactive authorization (`defineInteractiveAuthorization` / project OAuth helpers). The system MUST NOT require `@vercel/connect` or Connect connector UIDs for these integrations.

#### Scenario: No Connect UID required
- **WHEN** an operator configures MCP connections using `.env.example` variables
- **THEN** no `*_CONNECTOR` Vercel Connect UID is required for ClickUp, Slack, Asana, or Gmail

### Requirement: dFlow MCP connection with dynamic client registration
The system MUST provide a dFlow MCP connection using the official dFlow Cloud MCP endpoint and OAuth with dynamic client registration. dFlow MUST NOT require static client id/secret env vars.

#### Scenario: dFlow connection is defined
- **WHEN** the agent loads connections
- **THEN** a dFlow MCP connection is available for applications, environments, services, deployments, logs, templates, registries, and GitHub provider tools via interactive OAuth / DCR

#### Scenario: dFlow read tools do not require approval
- **WHEN** the model calls a reviewed dFlow list/get tool
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: dFlow write tools require approval
- **WHEN** the model calls a dFlow create/update or GitHub setup tool
- **THEN** the connection approval policy requires user approval

### Requirement: MCP OAuth grants are per signed-in user
MCP interactive authorization for Brain’s official connections MUST store and resolve access tokens for the authenticated user’s eve principal **within the active workspace**. One user’s connected grants MUST NOT be usable by another signed-in user. Grants in workspace A MUST NOT be used when the active workspace is B.

#### Scenario: User B does not inherit user A’s tokens
- **WHEN** user A has completed OAuth for a connection in workspace W and user B is signed in to W without completing OAuth for that connection
- **THEN** user B’s agent turns and connection status treat that connection as not connected for user B

#### Scenario: Same user keeps grants across sessions
- **WHEN** a user completes OAuth for a connection in a workspace and later signs in again with the same account and that workspace active
- **THEN** that user’s stored grant remains available for their principal in that workspace without requiring Vercel Connect

#### Scenario: Workspace isolation for grants
- **WHEN** a user has connected Slack in workspace A and switches active workspace to B without connecting Slack in B
- **THEN** connection status for B reports not connected for Slack

### Requirement: Host app credentials vs per-user grants
For static-credential MCP connections, Brain MAY store a host-wide OAuth app client id/secret (UI file or env) shared by all users on that host (platform/instance apps). Per-user isolation MUST apply to OAuth access/refresh grants scoped by workspace, not to the shared app registration. Mutating UI-stored host app credentials MUST be limited to the instance admin (host operator).

#### Scenario: Shared app, isolated grants
- **WHEN** the instance admin has configured host app credentials for a connection and user A and user B each complete OAuth in the same workspace
- **THEN** each user has a distinct stored grant and neither grant is usable as the other user’s principal

#### Scenario: Env credentials remain deploy-time fallback
- **WHEN** no UI-stored host or workspace credentials exist for a static-credential connection and the matching env vars are set
- **THEN** Menu Connect can authorize using those env credentials

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

