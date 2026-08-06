## MODIFIED Requirements

### Requirement: MCP OAuth grants are per signed-in user
MCP interactive authorization for Brain’s official connections MUST store and resolve access tokens for the authenticated user’s eve principal **within the active workspace**. One user’s connected grants MUST NOT be usable by another signed-in user. Grants in workspace A MUST NOT be used when the active workspace is B.

#### Scenario: User B does not inherit user A’s tokens
- **WHEN** user A has completed OAuth for a connection in workspace W and user B is signed in to W without completing OAuth for that connection
- **THEN** user B’s agent turns and connection status treat that connection as not connected for user B

#### Scenario: Same user keeps grants across sessions
- **WHEN** a user completes OAuth for a connection in a workspace and later signs in again with the same account and that workspace active
- **THEN** that user’s stored grant remains available for their principal in that workspace without requiring Vercel Connect

#### Scenario: Workspace isolation for grants
- **WHEN** a user has connected Slack in workspace A and switches active workspace to B without connecting Slack in B
- **THEN** connection status for B reports not connected for Slack

### Requirement: Host app credentials vs per-user grants
For static-credential MCP connections, Brain MAY store a single host-wide OAuth app client id/secret (UI file or env) shared by all users on that host (platform/instance apps). Per-user isolation MUST apply to OAuth access/refresh grants scoped by workspace, not to the shared app registration. Mutating UI-stored host app credentials MUST be limited to the instance admin (host operator). Workspace BYOA apps are out of scope for this change.

#### Scenario: Shared app, isolated grants
- **WHEN** the instance admin has configured host app credentials for a connection and user A and user B each complete OAuth in the same workspace
- **THEN** each user has a distinct stored grant and neither grant is usable as the other user’s principal

#### Scenario: Env credentials remain deploy-time fallback
- **WHEN** UI-stored app credentials are absent and env client credentials are set
- **THEN** Menu Connect and mid-turn OAuth can still authorize using the env credentials
