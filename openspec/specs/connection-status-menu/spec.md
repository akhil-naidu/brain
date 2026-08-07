# connection-status-menu Specification

## Purpose
Shows whether each MCP connection is ready, needs sign-in, or needs local setup.
## Requirements
### Requirement: Connection status API
The host MUST expose a status endpoint that reports each supported connection’s setup/auth state for the signed-in user **in the active workspace** without requiring a chat turn.

#### Scenario: Connected when a usable token exists
- **WHEN** a connection has a usable or refreshable stored token for the signed-in user in the active workspace
- **THEN** the status endpoint reports that connection as connected

#### Scenario: Needs sign-in when no token exists
- **WHEN** a connection’s local setup is complete but no token is stored for the signed-in user in the active workspace
- **THEN** the status endpoint reports that connection as needs sign-in

#### Scenario: Needs setup when app credentials are missing
- **WHEN** a static-credential connection has neither UI-stored nor env client credentials
- **THEN** the status endpoint reports that connection as needs setup

#### Scenario: Needs sign-in after UI credentials are saved
- **WHEN** a static-credential connection has UI-stored app credentials and no token for the signed-in user in the active workspace
- **THEN** the status endpoint reports needs sign-in (not needs setup)

#### Scenario: Users do not share connected status
- **WHEN** user A is connected for a connection in workspace W and user B has no token for that connection in W
- **THEN** user B’s status endpoint reports needs sign-in (or needs setup) for that connection, not connected

#### Scenario: Workspace switch changes status
- **WHEN** a user is connected in workspace A and switches to workspace B without a grant in B
- **THEN** status for B reports needs sign-in (or needs setup), not connected

#### Scenario: Unauthenticated status is rejected
- **WHEN** a client without a valid session requests connection status
- **THEN** the system rejects the request and does not report a shared anonymous principal’s state

### Requirement: Status visible in the integrations menu
The integrations menu MUST show each connection’s status alongside the enable toggle.

#### Scenario: Menu shows status labels
- **WHEN** the user opens the integrations menu
- **THEN** each connection row indicates Connected, Sign in, or Set up needed according to the status API

### Requirement: Tools page shows catalog on each connected app
The Tools page MCP management UI MUST show loaded tools on each connected app’s card so users who finish Connect can inspect available tools without hunting in a separate section.

#### Scenario: Connected row shows its tools
- **WHEN** the user views MCP connections on `/tools` and at least one connection is connected
- **THEN** that connection’s loaded tools are visible on its card without opening a chat turn

