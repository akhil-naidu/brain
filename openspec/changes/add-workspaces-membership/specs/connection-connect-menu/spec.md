## MODIFIED Requirements

### Requirement: Menu OAuth pending state is per signed-in user
When a signed-in user starts Menu Connect, Brain MUST persist pending OAuth state (PKCE verifier, state, client metadata, callback URL, principal) scoped to that user, **active workspace**, and connection. Starting Connect as user B or in another workspace MUST NOT overwrite user A’s in-flight pending state for the same connection in workspace A.

#### Scenario: Concurrent authorize attempts stay isolated
- **WHEN** user A has an in-flight Menu authorize for a connection in workspace W and user B starts Menu authorize for the same connection in W
- **THEN** user A’s pending state remains usable for A’s callback and user B receives a distinct pending state for B’s callback

#### Scenario: Pending state is workspace-scoped
- **WHEN** a user starts Menu authorize in workspace A and separately starts Menu authorize for the same connection in workspace B
- **THEN** each workspace has distinct pending state and completing B’s callback does not consume A’s pending state

## ADDED Requirements

### Requirement: Connect uses active workspace
Menu Connect and Disconnect MUST store and clear OAuth grants for the signed-in user in the **active workspace** only.

#### Scenario: Connect stores grant in active workspace
- **WHEN** a signed-in user completes Menu Connect while workspace W is active
- **THEN** the stored grant is associated with that user and workspace W
