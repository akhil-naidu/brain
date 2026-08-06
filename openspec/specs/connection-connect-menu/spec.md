# connection-connect-menu Specification

## Purpose
Lets signed-in users Connect, Disconnect, and (for the host operator) configure MCP OAuth app credentials from the integrations menu without a chat turn.
## Requirements
### Requirement: Menu OAuth start API
The host MUST expose an authorize endpoint that starts MCP OAuth for a supported connection and the signed-in user’s principal without requiring a chat turn.

#### Scenario: Authorize returns a browser URL when setup is complete
- **WHEN** a connection has required client credentials configured and a signed-in user requests authorize for that connection id
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
The host MUST complete the OAuth code exchange on the Brain callback route and store the access token for the principal recorded on the matching pending authorize attempt (the user who started Connect).

#### Scenario: Successful callback connects the initiating user
- **WHEN** the identity provider redirects to the Brain callback with a valid code and matching state
- **THEN** the system stores a usable token for that connection and the pending attempt’s principal and shows a simple success page

#### Scenario: Invalid callback state is rejected
- **WHEN** the callback state does not match any pending authorize attempt for that connection
- **THEN** the system does not store a token and reports failure

### Requirement: Menu OAuth pending state is per signed-in user
When a signed-in user starts Menu Connect, Brain MUST persist pending OAuth state (PKCE verifier, state, client metadata, callback URL, principal) scoped to that user and connection. Starting Connect as user B MUST NOT overwrite user A’s in-flight pending state for the same connection.

#### Scenario: Concurrent authorize attempts stay isolated
- **WHEN** user A has an in-flight Menu authorize for a connection and user B starts Menu authorize for the same connection
- **THEN** user A’s pending state remains usable for A’s callback and user B receives a distinct pending state for B’s callback

### Requirement: Connect control in the integrations menu
The integrations menu MUST offer Connect for connections that need sign-in.

#### Scenario: Connect shown when sign-in is needed
- **WHEN** the integrations menu loads status and a connection is needs_sign_in
- **THEN** that row shows a Connect control that starts the authorize flow

#### Scenario: Connect hidden when setup is missing
- **WHEN** a connection is needs_setup
- **THEN** the menu does not offer Connect for that row

### Requirement: Menu disconnect API
The host MUST expose a disconnect endpoint that clears the stored OAuth token for a supported connection and the signed-in user. Disconnect MUST clear that user’s pending Menu OAuth for the connection when present and MUST NOT clear another user’s pending attempt.

#### Scenario: Disconnect removes a stored token
- **WHEN** a connection has a stored token for the signed-in user and the client requests disconnect
- **THEN** the system deletes that token so subsequent status reports needs sign-in for that user

#### Scenario: Disconnect is idempotent
- **WHEN** disconnect is requested for a connection with no stored token for the signed-in user
- **THEN** the system still succeeds without error

#### Scenario: Disconnect leaves another user’s pending intact
- **WHEN** user A has an in-flight Menu authorize and user B disconnects the same connection
- **THEN** user A’s pending authorize state remains available for A’s callback

### Requirement: Disconnect control in the integrations menu
The integrations menu MUST offer Disconnect for connections that are connected.

#### Scenario: Disconnect shown when connected
- **WHEN** the integrations menu loads status and a connection is connected
- **THEN** that row shows a Disconnect control that clears the local token and refreshes status

#### Scenario: Disconnect hidden when not connected
- **WHEN** a connection is needs_sign_in or needs_setup
- **THEN** the menu does not offer Disconnect for that row

### Requirement: Menu credential setup mutations require the operator
Brain MUST allow any signed-in user to read setup metadata for a static-credential connection (without secrets). Brain MUST allow only the host operator to create, update, or delete UI-stored host app credentials via the setup API.

#### Scenario: Non-operator cannot save credentials
- **WHEN** a signed-in non-operator user puts client credentials for a supported connection
- **THEN** the system rejects the request and does not change the host credential file

#### Scenario: Operator can save credentials
- **WHEN** the operator puts a client id (and secret when required) for a supported connection
- **THEN** the system stores them under the host credential file and subsequent authorize/status treat setup as complete

#### Scenario: Non-operator can read setup metadata
- **WHEN** a signed-in non-operator requests setup metadata for a static-credential connection
- **THEN** the response includes whether credentials exist and the public callback URL and MUST NOT include client secrets

### Requirement: Menu credential setup API
The host MUST expose a setup endpoint for static-credential MCP connections that reads host-local OAuth app credential metadata for the Brain process without returning secrets, and that writes or clears those credentials only for the operator (see operator requirement above).

#### Scenario: Setup metadata includes redirect URI
- **WHEN** a signed-in user requests setup for a static-credential connection
- **THEN** the response includes whether a client secret is required, whether credentials exist, credential source when known, and the public callback URL — and MUST NOT include client secrets

#### Scenario: Clearing removes only stored credentials
- **WHEN** the operator deletes setup for a connection
- **THEN** the system removes the UI-stored credentials file without clearing env-based credentials

#### Scenario: DCR connections reject setup
- **WHEN** setup is requested for a DCR connection that does not need static app credentials
- **THEN** the endpoint fails with a clear error

### Requirement: Configure control in the integrations menu
The integrations menu MUST offer Set up for connections that need setup.

#### Scenario: Set up shown when setup is needed
- **WHEN** the integrations menu loads status and a connection is needs_setup
- **THEN** that row shows a Set up control that opens a dialog to enter app id/secret and copy the return link

#### Scenario: Set up hidden when setup is complete
- **WHEN** a connection is needs_sign_in or connected
- **THEN** the menu does not offer Set up for that row

### Requirement: Enable toggle requires a connected app
The integrations menu MUST only allow turning a connection on when that connection is connected. Turning off remains allowed anytime.

#### Scenario: Toggle on blocked before connect
- **WHEN** a connection is needs_setup or needs_sign_in
- **THEN** the user cannot turn that connection on, and the menu explains they must set up or connect first

#### Scenario: Toggle on allowed when connected
- **WHEN** a connection is connected
- **THEN** the user can turn that connection on for the current chat
