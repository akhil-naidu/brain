# connection-connect-menu Specification

## Purpose
TBD - created by archiving change add-connection-connect-menu. Update Purpose after archive.
## Requirements
### Requirement: Menu OAuth start API
The host MUST expose an authorize endpoint that starts MCP OAuth for a supported connection and the local chat principal without requiring a chat turn.

#### Scenario: Authorize returns a browser URL when setup is complete
- **WHEN** a connection has required client credentials configured and the client requests authorize for that connection id
- **THEN** the system returns an https/http authorize URL and the Brain callback URL used as redirect_uri

#### Scenario: Authorize rejects missing setup
- **WHEN** a connection requires client credentials that are not configured
- **THEN** the authorize endpoint fails with a clear needs-setup error and does not return an authorize URL

### Requirement: Menu OAuth callback stores the token
The host MUST complete the OAuth code exchange on the Brain callback route and store the access token for the local chat principal.

#### Scenario: Successful callback connects the principal
- **WHEN** the identity provider redirects to the Brain callback with a valid code and matching state
- **THEN** the system stores a usable token for that connection and principal and shows a simple success page

#### Scenario: Invalid callback state is rejected
- **WHEN** the callback state does not match the pending authorize attempt
- **THEN** the system does not store a token and reports failure

### Requirement: Connect control in the integrations menu
The integrations menu MUST offer Connect for connections that need sign-in.

#### Scenario: Connect shown when sign-in is needed
- **WHEN** the integrations menu loads status and a connection is needs_sign_in
- **THEN** that row shows a Connect control that starts the authorize flow

#### Scenario: Connect hidden when setup is missing
- **WHEN** a connection is needs_setup
- **THEN** the menu does not offer Connect for that row

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

