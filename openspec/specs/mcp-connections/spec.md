## Purpose

Defines Brain's official MCP connections (ClickUp, Slack, Asana, Gmail, Notion, Linear, Atlassian, Zernio, Sentry, dFlow, GitHub, Snowflake) and how OAuth credentials are obtained for user-scoped tool access without Vercel Connect.
## Requirements
### Requirement: ClickUp MCP connection with dynamic client registration
The system MUST provide a ClickUp MCP connection using the official ClickUp MCP endpoint and OAuth with dynamic client registration. ClickUp MUST NOT require static client id/secret env vars.

#### Scenario: ClickUp connection is defined
- **WHEN** the agent loads connections
- **THEN** a ClickUp MCP connection is available for task/workspace tools via interactive OAuth / DCR

### Requirement: Notion MCP connection with dynamic client registration
The system MUST provide a Notion MCP connection using the official Notion MCP endpoint (`https://mcp.notion.com/mcp`) and OAuth with dynamic client registration. Notion MUST NOT require static client id/secret env vars.

#### Scenario: Notion connection is defined
- **WHEN** the agent loads connections
- **THEN** a Notion MCP connection is available for workspace search/read/write tools via interactive OAuth / DCR

### Requirement: Linear MCP connection with dynamic client registration
The system MUST provide a Linear MCP connection using the official Linear MCP endpoint (`https://mcp.linear.app/mcp`) and OAuth with dynamic client registration. Linear MUST NOT require static client id/secret env vars.

#### Scenario: Linear connection is defined
- **WHEN** the agent loads connections
- **THEN** a Linear MCP connection is available for issues/projects/teams tools via interactive OAuth / DCR

### Requirement: Atlassian MCP connection with dynamic client registration
The system MUST provide an Atlassian Rovo MCP connection using the official endpoint (`https://mcp.atlassian.com/v1/mcp/authv2`) and OAuth with dynamic client registration. Atlassian MUST NOT require static client id/secret env vars.

#### Scenario: Atlassian connection is defined
- **WHEN** the agent loads connections
- **THEN** an Atlassian MCP connection is available for Jira/Confluence/Compass tools via interactive OAuth / DCR

### Requirement: Zernio MCP connection with dynamic client registration
The system MUST provide a Zernio MCP connection using the official Zernio MCP endpoint (`https://mcp.zernio.com/mcp`) and OAuth with dynamic client registration. Zernio MUST NOT require static client id/secret env vars.

#### Scenario: Zernio connection is defined
- **WHEN** the agent loads connections
- **THEN** a Zernio MCP connection is available for social posting, accounts, analytics, and messaging tools via interactive OAuth / DCR

### Requirement: Sentry MCP connection with dynamic client registration
The system MUST provide a Sentry MCP connection using the official Sentry MCP endpoint (`https://mcp.sentry.dev/mcp`) and OAuth with dynamic client registration. Sentry MUST NOT require static client id/secret env vars.

#### Scenario: Sentry connection is defined
- **WHEN** the agent loads connections
- **THEN** a Sentry MCP connection is available for organizations, projects, issues, and Seer tools via interactive OAuth / DCR

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

### Requirement: Task and issue write tools require user approval
MCP connections that create or mutate work items (tasks, issues, comments that change work, status updates, assignees) MUST require in-chat user approval before execution. Only explicitly reviewed read/list/get tools MAY skip approval (`not-applicable`). Unknown tool names MUST require approval (fail closed). Brain MUST NOT auto-approve create/update/delete task tools by default; remembered “always allow” is out of scope until separately specified.

#### Scenario: ClickUp task writes require approval
- **WHEN** the model calls `clickup_create_task` or `clickup_update_task`
- **THEN** the connection approval policy requires user approval

#### Scenario: ClickUp task reads skip approval
- **WHEN** the model calls a reviewed ClickUp read tool such as `clickup_get_task` or `clickup_filter_tasks`
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: Linear issue writes require approval
- **WHEN** the model calls `save_issue` (or another Linear write tool not on the reviewed read-only list)
- **THEN** the connection approval policy requires user approval

#### Scenario: Asana task writes require approval
- **WHEN** the model calls an Asana create/update task tool that is not on the reviewed read-only list
- **THEN** the connection approval policy requires user approval

### Requirement: Snowflake MCP connection with account MCP URL and PAT
The system MUST provide a Snowflake-managed MCP connection authenticated with a programmatic access token (PAT), matching the official Cursor Snowflake plugin model (URL + PAT, no OAuth app). Workspace owners/admins MUST be able to save MCP server URL + PAT via Tools Set up / App settings (workspace BYOA). Host operator credentials and `SNOWFLAKE_MCP_SERVER_URL` / `SNOWFLAKE_PAT_TOKEN` MUST remain fallbacks. Resolution MUST prefer workspace UI credentials, then host UI credentials, then env. Snowflake MUST NOT require an OAuth app client id/secret, Vercel Connect, dynamic client registration, or Menu Connect OAuth.

#### Scenario: Snowflake connection is defined
- **WHEN** the agent loads connections and Snowflake credentials resolve for the active workspace
- **THEN** a Snowflake MCP connection is available using Bearer PAT auth against that workspace’s MCP server URL

#### Scenario: Snowflake needs URL or PAT
- **WHEN** workspace, host, and env Snowflake credentials are all missing or invalid
- **THEN** connection status reports needs_setup like other MCP apps that need Set up

#### Scenario: Snowflake Set up without OAuth Connect
- **WHEN** a workspace admin views Snowflake on Tools
- **THEN** the UI offers Set up / App settings for MCP URL + PAT and does not offer OAuth Connect or Disconnect

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
- **WHEN** a workspace admin saves Slack client id/secret for the active workspace via Tools Set up / App settings
- **THEN** those credentials are stored for that workspace only

#### Scenario: Tools has a single MCP connections surface
- **WHEN** a signed-in user opens `/tools`
- **THEN** app credential setup, Connect, and loaded tools are managed on that MCP connections surface without a separate Workspace apps tab

#### Scenario: Member cannot mutate BYOA
- **WHEN** a workspace member without admin/owner role attempts to save or clear BYOA credentials
- **THEN** the system rejects the mutation

#### Scenario: Member UI does not offer Set up
- **WHEN** a workspace member views a static-credential connection that is needs_setup
- **THEN** Tools and the integrations menu do not offer Set up / App settings and indicate a workspace admin must set up the app

