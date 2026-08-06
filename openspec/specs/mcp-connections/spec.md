## Purpose

Defines Brain's official MCP connections (ClickUp, Slack, Asana, Gmail, dFlow, GitHub, Snowflake, Zernio) and how OAuth credentials are obtained for user-scoped tool access without Vercel Connect.
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

### Requirement: Snowflake MCP connection with account URL and Programmatic Access Token
The system MUST provide a Snowflake-managed MCP connection using the same auth model as Cursor's Snowflake plugin: an account MCP server URL plus a Programmatic Access Token sent as a Bearer token. Values MUST be resolvable from UI-stored host credentials (Set up) or from `SNOWFLAKE_MCP_URL` / `SNOWFLAKE_PAT_TOKEN`, with stored credentials preferred. The connection MUST NOT require a Snowflake OAuth security integration, Vercel Connect, or dynamic client registration.

#### Scenario: Snowflake connection is defined
- **WHEN** the agent loads connections
- **THEN** a Snowflake MCP connection is available for Cortex Agents, Analyst, Search, SQL, and custom tools via PAT bearer auth

#### Scenario: Snowflake needs setup without MCP URL or PAT
- **WHEN** neither UI-stored nor env MCP URL/PAT is configured
- **THEN** the status endpoint reports Snowflake as needs setup

#### Scenario: Snowflake Set up accepts MCP URL and PAT
- **WHEN** the operator saves Snowflake setup with an MCP server URL and Programmatic Access Token
- **THEN** those values are stored host-locally and status becomes connected without a browser OAuth Connect step

#### Scenario: Snowflake tools require approval by default
- **WHEN** the model calls a Snowflake MCP tool
- **THEN** the connection approval policy requires user approval (tool names are per-server)

### Requirement: Zernio MCP connection with dynamic client registration
The system MUST provide a Zernio MCP connection using the official hosted MCP endpoint (`https://mcp.zernio.com/mcp`) and OAuth 2.1 with PKCE and dynamic client registration. Zernio MUST NOT require static client id/secret env vars.

#### Scenario: Zernio connection is defined
- **WHEN** the agent loads connections
- **THEN** a Zernio MCP connection is available for posts, accounts, analytics, messaging, and ads tools via interactive OAuth / DCR

#### Scenario: Zernio read tools do not require approval
- **WHEN** the model calls a reviewed Zernio list/get/search tool
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: Zernio write tools require approval
- **WHEN** the model calls a Zernio create/publish/message/ads tool (including `call_tool`)
- **THEN** the connection approval policy requires user approval

