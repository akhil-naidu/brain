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

### Requirement: Menu OAuth callback uses the public origin
The authorize endpoint MUST build `redirect_uri` from the public Brain origin, not the internal listen address. Resolution MUST prefer `BRAIN_PUBLIC_URL` / `BRAIN_PUBLIC_ORIGIN` when set, then the request `Origin`/`Referer`, then forwarded host/proto headers, and only then the internal request URL origin.

#### Scenario: Proxied host does not collapse to localhost
- **WHEN** the browser originates Menu Connect from `https://brain.example.com` while the Node server listens on `localhost:3000`
- **THEN** the OAuth `redirect_uri` uses `https://brain.example.com/api/connections/{id}/callback`

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

### Requirement: Menu credential setup API
The host MUST expose a setup endpoint for static-credential MCP connections that reads/writes host-local OAuth app credentials for the Brain process without returning secrets.

#### Scenario: Setup metadata includes redirect URI
- **WHEN** the client requests setup for a static-credential connection
- **THEN** the response includes whether a client secret is required, whether credentials exist, credential source when known, and the public callback URL — and MUST NOT include client secrets

#### Scenario: Saving credentials stores them on the host
- **WHEN** the client puts a client id (and secret when required) for a supported connection
- **THEN** the system stores them under the host `.eve/` credential file and subsequent authorize/status treat setup as complete

#### Scenario: Clearing removes only stored credentials
- **WHEN** the client deletes setup for a connection
- **THEN** the system removes the UI-stored credentials file without clearing env-based credentials

#### Scenario: DCR connections reject setup
- **WHEN** setup is requested for a DCR connection that does not need static app credentials
- **THEN** the endpoint fails with a clear error

### Requirement: Configure control in the integrations menu
The integrations menu MUST offer Configure for connections that need setup.

#### Scenario: Configure shown when setup is needed
- **WHEN** the integrations menu loads status and a connection is needs_setup
- **THEN** that row shows a Configure control that opens a dialog to enter client id/secret and copy the redirect URI

#### Scenario: Configure hidden when setup is complete
- **WHEN** a connection is needs_sign_in or connected
- **THEN** the menu does not offer Configure for that row

