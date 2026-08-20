## ADDED Requirements

### Requirement: Rybbit MCP connection with HTTP URL and API key
The system MUST provide a Rybbit analytics MCP connection over Streamable HTTP. Workspace owners/admins MUST be able to save MCP server URL and API key via Tools Set up (workspace BYOA). Host operator credentials and `RYBBIT_MCP_URL` / `RYBBIT_MCP_TOKEN` MUST remain fallbacks. Resolution MUST prefer workspace UI credentials, then host UI credentials, then env. Status MUST remain needs_setup until both a valid URL and a non-empty bearer token resolve. Rybbit MUST NOT require an OAuth app, Vercel Connect, or Menu Connect OAuth.

#### Scenario: Rybbit connection is defined
- **WHEN** the agent loads connections and Rybbit URL plus API key resolve for the active workspace
- **THEN** a Rybbit MCP connection is available through Brain’s HTTP MCP proxy

#### Scenario: Rybbit URL without API key needs setup
- **WHEN** a Rybbit MCP URL is stored without a bearer token and env token is unset
- **THEN** connection status reports needs_setup

#### Scenario: Rybbit Set up without OAuth Connect
- **WHEN** a workspace admin views Rybbit on Tools
- **THEN** the UI offers Set up / App settings for MCP URL + API key and does not offer OAuth Connect or Disconnect

#### Scenario: Rybbit reads skip approval
- **WHEN** the model calls a reviewed Rybbit read tool such as `list_sites` and posture is `auto`
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: Rybbit writes and run_query require approval
- **WHEN** the model calls `delete_site` or `run_query` and posture is `auto`
- **THEN** the connection approval policy requires user approval

### Requirement: Bytebot MCP connection with HTTP URL
The system MUST provide a Bytebot desktop MCP connection over HTTP. Workspace owners/admins MUST be able to save MCP server URL and optional bearer via Tools Set up (workspace BYOA). Host operator credentials and `BYTEBOT_MCP_URL` / `BYTEBOT_MCP_TOKEN` MUST remain fallbacks. A valid URL without a token MUST be sufficient for connected status. Bytebot MUST NOT require an OAuth app, Vercel Connect, or Menu Connect OAuth. Desktop tools MUST require user approval in Auto (empty reviewed read list).

#### Scenario: Bytebot connection is defined
- **WHEN** the agent loads connections and a Bytebot MCP URL resolves for the active workspace
- **THEN** a Bytebot MCP connection is available through Brain’s HTTP MCP proxy

#### Scenario: Bytebot URL without token is connected
- **WHEN** a Bytebot MCP URL is stored and no bearer token is set
- **THEN** connection status reports connected

#### Scenario: Bytebot Set up without OAuth Connect
- **WHEN** a workspace admin views Bytebot on Tools
- **THEN** the UI offers Set up / App settings for MCP URL (+ optional bearer) and does not offer OAuth Connect or Disconnect

#### Scenario: Bytebot desktop tools require approval
- **WHEN** the model calls a Bytebot desktop tool such as screenshot or click and posture is `auto`
- **THEN** the connection approval policy requires user approval
