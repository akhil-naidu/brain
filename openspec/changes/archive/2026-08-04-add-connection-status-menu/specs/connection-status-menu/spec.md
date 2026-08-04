## Purpose

Shows whether each MCP connection is ready, needs sign-in, or needs local setup.

## ADDED Requirements

### Requirement: Connection status API
The host MUST expose a status endpoint that reports each supported connection’s setup/auth state for the local chat principal without requiring a chat turn.

#### Scenario: Connected when a usable token exists
- **WHEN** a connection has a usable or refreshable stored token for the chat principal
- **THEN** the status endpoint reports that connection as connected

#### Scenario: Needs sign-in when no token exists
- **WHEN** a connection’s local setup is complete but no token is stored
- **THEN** the status endpoint reports that connection as needs sign-in

#### Scenario: Needs setup when required env is missing
- **WHEN** a connection requires client credentials that are not configured
- **THEN** the status endpoint reports that connection as needs setup

### Requirement: Status visible in the integrations menu
The integrations menu MUST show each connection’s status alongside the enable toggle.

#### Scenario: Menu shows status labels
- **WHEN** the user opens the integrations menu
- **THEN** each connection row indicates Connected, Sign in, or Needs setup according to the status API
