## MODIFIED Requirements

### Requirement: Connection status API
The host MUST expose a status endpoint that reports each supported connection’s setup/auth state for the local chat principal without requiring a chat turn.

#### Scenario: Connected when a usable token exists
- **WHEN** a connection has a usable or refreshable stored token for the chat principal
- **THEN** the status endpoint reports that connection as connected

#### Scenario: Needs sign-in when no token exists
- **WHEN** a connection’s local setup is complete but no token is stored
- **THEN** the status endpoint reports that connection as needs sign-in

#### Scenario: Needs setup when app credentials are missing
- **WHEN** a static-credential connection has neither UI-stored nor env client credentials
- **THEN** the status endpoint reports that connection as needs setup

#### Scenario: Needs sign-in after UI credentials are saved
- **WHEN** a static-credential connection has UI-stored app credentials and no token
- **THEN** the status endpoint reports needs sign-in (not needs setup)
