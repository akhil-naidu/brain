## MODIFIED Requirements

### Requirement: Connection status API
The host MUST expose a status endpoint that reports each supported connection’s setup/auth state for the **authenticated user’s** principal without requiring a chat turn. Unauthenticated status requests MUST be rejected. Status for one user MUST NOT reflect another user’s tokens.

#### Scenario: Connected when a usable token exists
- **WHEN** a signed-in user has a usable or refreshable stored token for a connection
- **THEN** the status endpoint reports that connection as connected for that user

#### Scenario: Needs sign-in when no token exists
- **WHEN** a signed-in user’s connection local setup is complete but no token is stored for their principal
- **THEN** the status endpoint reports that connection as needs sign-in

#### Scenario: Needs setup when app credentials are missing
- **WHEN** a signed-in user checks a static-credential connection that has neither UI-stored nor env client credentials
- **THEN** the status endpoint reports that connection as needs setup

#### Scenario: Needs sign-in after UI credentials are saved
- **WHEN** a static-credential connection has UI-stored app credentials and the signed-in user has no token
- **THEN** the status endpoint reports needs sign-in (not needs setup)

#### Scenario: Unauthenticated status is rejected
- **WHEN** a client without a valid session requests connection status
- **THEN** the system rejects the request and does not report the shared anonymous principal’s state
