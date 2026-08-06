## MODIFIED Requirements

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
