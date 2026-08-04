## Purpose

Defines Brain's official MCP connections (ClickUp, Slack, Asana, Gmail) and how OAuth credentials are obtained for user-scoped tool access without Vercel Connect.
## Requirements
### Requirement: ClickUp MCP connection with dynamic client registration
The system MUST provide a ClickUp MCP connection using the official ClickUp MCP endpoint and OAuth with dynamic client registration. ClickUp MUST NOT require static client id/secret env vars.

#### Scenario: ClickUp connection is defined
- **WHEN** the agent loads connections
- **THEN** a ClickUp MCP connection is available for task/workspace tools via interactive OAuth / DCR

### Requirement: Slack MCP connection with env client credentials
The system MUST provide a Slack MCP connection using official Slack MCP, authenticated with `SLACK_MCP_CLIENT_ID` and `SLACK_MCP_CLIENT_SECRET` when configured.

#### Scenario: Slack authorize needs registered redirect
- **WHEN** a user starts Slack MCP authorization
- **THEN** the system produces an authorize URL / redirect URI the operator can register on the Slack app

### Requirement: Asana MCP connection with env client credentials
The system MUST provide an Asana MCP connection using official Asana MCP, authenticated with `ASANA_MCP_CLIENT_ID` and `ASANA_MCP_CLIENT_SECRET` when configured.

#### Scenario: Asana connection is defined
- **WHEN** the agent loads connections
- **THEN** an Asana MCP connection is available via interactive OAuth with env client credentials

### Requirement: Gmail MCP connection with Google OAuth client
The system MUST provide a Gmail MCP connection using official Gmail MCP, authenticated with `GOOGLE_MCP_CLIENT_ID` and `GOOGLE_MCP_CLIENT_SECRET` when configured.

#### Scenario: Gmail connection is defined
- **WHEN** the agent loads connections
- **THEN** a Gmail MCP connection is available via interactive OAuth with Google client credentials

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

