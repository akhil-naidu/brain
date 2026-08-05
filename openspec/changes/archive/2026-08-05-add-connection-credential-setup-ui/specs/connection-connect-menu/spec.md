## ADDED Requirements

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
