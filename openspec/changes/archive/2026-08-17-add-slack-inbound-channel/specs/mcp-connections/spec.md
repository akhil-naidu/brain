## ADDED Requirements

### Requirement: Slack MCP Connect records inbound identity
When a user completes Slack MCP OAuth Connect, the system MUST persist that user's Slack user id and Slack team id associated with their Brain user id and the workspace of the grant. Those ids MUST be usable later to map inbound Slack events to that principal. Disconnecting Slack MCP MUST forget that mapping for that user and workspace.

#### Scenario: Connect stores Slack user id
- **WHEN** user A completes Slack Connect in workspace W
- **THEN** a later inbound event from that Slack user in that Slack team maps to user A

#### Scenario: Disconnect clears mapping
- **WHEN** user A disconnects Slack in workspace W
- **THEN** inbound events from that Slack user no longer map through W's grant (unless another workspace grant or unique email match remains)

### Requirement: Slack bot credentials are distinct from MCP app credentials
Host Slack *inbound* bot token and signing secret MUST be configured separately from Slack MCP client id/secret (`SLACK_MCP_CLIENT_ID` / `SLACK_MCP_CLIENT_SECRET` or UI-stored MCP app credentials). MCP user grants MUST continue to power Slack *tools*; the bot token MUST power inbound Events and HITL replies.

#### Scenario: MCP Connect still uses user OAuth
- **WHEN** a user Connects Slack from `/tools` after inbound bot credentials are configured
- **THEN** Slack MCP tools still use that user's OAuth grant, not the bot token

#### Scenario: Bot token is not the MCP client secret
- **WHEN** an operator sets `SLACK_BOT_TOKEN` without changing MCP client id/secret
- **THEN** Menu Connect Slack OAuth continues to use the MCP app credentials
