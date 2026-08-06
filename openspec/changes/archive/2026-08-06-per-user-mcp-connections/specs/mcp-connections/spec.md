## ADDED Requirements

### Requirement: Host app credentials vs per-user grants
For static-credential MCP connections, Brain MAY store a single host-wide OAuth app client id/secret (UI file or env) shared by all users on that host. Per-user isolation MUST apply to OAuth access/refresh grants, not to the shared app registration. Mutating UI-stored host app credentials MUST be limited to the host operator.

#### Scenario: Shared app, isolated grants
- **WHEN** the operator has configured host app credentials for a connection and user A and user B each complete OAuth
- **THEN** each user has a distinct stored grant and neither grant is usable as the other user’s principal

#### Scenario: Env credentials remain deploy-time fallback
- **WHEN** UI-stored app credentials are absent and env client credentials are set
- **THEN** Menu Connect and mid-turn OAuth can still authorize using the env credentials
