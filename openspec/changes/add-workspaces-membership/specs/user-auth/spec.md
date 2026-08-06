## MODIFIED Requirements

### Requirement: Bootstrap initial account
A fresh Brain host with no users MUST provide a bootstrap path to create the first account without open public self-signup for arbitrary strangers. That first account MUST become an instance admin and MUST receive workspace membership (Personal workspace when auto personal policy is enabled). After bootstrap, public registration MUST follow the instance signup mode policy (default `invite-only`).

#### Scenario: First operator creation
- **WHEN** the host has zero user accounts and an authorized bootstrap action creates the first account
- **THEN** that account can sign in as instance admin, has a workspace membership, and open public registration remains unavailable when signup mode is `invite-only`

### Requirement: Session maps to eve user principal
Each authenticated Brain session MUST map to a stable eve user principal (`principalType` user with a stable user id) used for MCP OAuth token storage and agent authorization. Resolution of workspace-scoped grants and data MUST also use the session’s active workspace id.

#### Scenario: Principal is stable across reloads
- **WHEN** the same user signs in again after a reload
- **THEN** MCP connection tokens and per-user chat records continue to resolve to that same principal id within the active workspace

#### Scenario: Active workspace included
- **WHEN** a signed-in user has selected an active workspace
- **THEN** eve turns and connection grant lookup use that workspace id together with the user principal

## ADDED Requirements

### Requirement: Signup follows instance policy
After the first user exists, email/password self-signup MUST be allowed only when instance signup mode is `open`, or when an invite-driven registration path explicitly creates the account. The system MUST NOT require Vercel auth products for signup.

#### Scenario: Open signup creates user
- **WHEN** signup mode is `open` and a visitor completes sign-up with valid email and password
- **THEN** a user account is created and can sign in

### Requirement: Instance admin distinct from workspace admin
The system MUST treat instance admin as a host-level role separate from workspace owner/admin. Instance admins MAY manage instance policies; workspace admins manage only their workspace membership and invites.

#### Scenario: Workspace admin is not instance admin
- **WHEN** a user is workspace admin but not instance admin
- **THEN** they can invite to that workspace but cannot change host signup mode
