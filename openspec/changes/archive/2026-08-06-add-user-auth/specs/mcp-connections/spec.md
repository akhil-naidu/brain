## ADDED Requirements

### Requirement: MCP OAuth grants are per signed-in user
MCP interactive authorization for Brain’s official connections MUST store and resolve access tokens for the authenticated user’s eve principal. One user’s connected grants MUST NOT be usable by another signed-in user on the same host.

#### Scenario: User B does not inherit user A’s tokens
- **WHEN** user A has completed OAuth for a connection and user B is signed in without completing OAuth for that connection
- **THEN** user B’s agent turns and connection status treat that connection as not connected for user B

#### Scenario: Same user keeps grants across sessions
- **WHEN** a user completes OAuth for a connection and later signs in again with the same account
- **THEN** that user’s stored grant remains available for their principal without requiring Vercel Connect
