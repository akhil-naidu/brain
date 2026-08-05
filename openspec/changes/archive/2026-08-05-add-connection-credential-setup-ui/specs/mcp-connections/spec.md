## MODIFIED Requirements

### Requirement: Slack MCP connection with env client credentials
The system MUST provide a Slack MCP connection using official Slack MCP. App credentials MUST be resolvable from UI-stored host credentials or `SLACK_MCP_CLIENT_ID` / `SLACK_MCP_CLIENT_SECRET`, with stored credentials preferred.

#### Scenario: Slack authorize needs registered redirect
- **WHEN** a user starts Slack MCP authorization
- **THEN** the system produces an authorize URL / redirect URI the operator can register on the Slack app

#### Scenario: Slack accepts UI-stored app credentials
- **WHEN** Slack client id and secret are saved via Configure and env vars are unset
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
