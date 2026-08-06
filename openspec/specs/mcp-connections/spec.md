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

### Requirement: Host app credentials vs per-user grants
For static-credential MCP connections, Brain MAY store a single host-wide OAuth app client id/secret (UI file or env) shared by all users on that host. Per-user isolation MUST apply to OAuth access/refresh grants, not to the shared app registration. Mutating UI-stored host app credentials MUST be limited to the host operator.

#### Scenario: Shared app, isolated grants
- **WHEN** the operator has configured host app credentials for a connection and user A and user B each complete OAuth
- **THEN** each user has a distinct stored grant and neither grant is usable as the other user’s principal

#### Scenario: Env credentials remain deploy-time fallback
- **WHEN** UI-stored app credentials are absent and env client credentials are set
- **THEN** Menu Connect and mid-turn OAuth can still authorize using the env credentials

