## ADDED Requirements

### Requirement: Menu disconnect API
The host MUST expose a disconnect endpoint that clears the stored OAuth token for a supported connection and the local chat principal.

#### Scenario: Disconnect removes a stored token
- **WHEN** a connection has a stored token for the chat principal and the client requests disconnect
- **THEN** the system deletes that token so subsequent status reports needs sign-in

#### Scenario: Disconnect is idempotent
- **WHEN** disconnect is requested for a connection with no stored token
- **THEN** the system still succeeds without error

### Requirement: Disconnect control in the integrations menu
The integrations menu MUST offer Disconnect for connections that are connected.

#### Scenario: Disconnect shown when connected
- **WHEN** the integrations menu loads status and a connection is connected
- **THEN** that row shows a Disconnect control that clears the local token and refreshes status

#### Scenario: Disconnect hidden when not connected
- **WHEN** a connection is needs_sign_in or needs_setup
- **THEN** the menu does not offer Disconnect for that row
