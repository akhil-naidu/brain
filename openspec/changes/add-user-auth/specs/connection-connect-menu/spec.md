## MODIFIED Requirements

### Requirement: Menu OAuth start API
The host MUST expose an authorize endpoint that starts MCP OAuth for a supported connection and the **authenticated user’s** principal without requiring a chat turn. Unauthenticated authorize requests MUST be rejected.

#### Scenario: Authorize returns a browser URL when setup is complete
- **WHEN** a signed-in user requests authorize for a connection that has required client credentials configured
- **THEN** the system returns an https/http authorize URL and the Brain callback URL used as redirect_uri for that user’s principal

#### Scenario: Authorize rejects missing setup
- **WHEN** a signed-in user requests authorize for a connection that requires client credentials that are not configured
- **THEN** the authorize endpoint fails with a clear needs-setup error and does not return an authorize URL

#### Scenario: Authorize rejects unauthenticated callers
- **WHEN** a client without a valid session requests authorize
- **THEN** the system rejects the request and does not start OAuth for a shared anonymous principal

### Requirement: Menu OAuth callback stores the token
The host MUST complete the OAuth code exchange on the Brain callback route and store the access token for the **authenticated user’s** principal that started the flow.

#### Scenario: Successful callback connects the principal
- **WHEN** the identity provider redirects to the Brain callback with a valid code and matching state for a signed-in user’s pending authorize
- **THEN** the system stores a usable token for that connection and that user’s principal and shows a simple success page

#### Scenario: Invalid callback state is rejected
- **WHEN** the callback state does not match the pending authorize attempt
- **THEN** the system does not store a token and reports failure

### Requirement: Menu disconnect API
The host MUST expose a disconnect endpoint that clears the stored OAuth token for a supported connection and the **authenticated user’s** principal. Unauthenticated disconnect requests MUST be rejected.

#### Scenario: Disconnect removes a stored token
- **WHEN** a signed-in user requests disconnect for a connection that has a stored token for their principal
- **THEN** the system deletes that token so subsequent status reports needs sign-in for that user

#### Scenario: Disconnect is idempotent
- **WHEN** a signed-in user requests disconnect for a connection with no stored token for their principal
- **THEN** the system still succeeds without error
