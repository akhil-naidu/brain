## Purpose

Instance policies control signup mode and workspace provisioning defaults for the whole Brain host.

## ADDED Requirements

### Requirement: Public signup status
Unauthenticated clients MUST be able to read whether open signup is currently allowed (derived from signup mode and bootstrap state) so auth pages can link correctly.

#### Scenario: Status reflects open mode
- **WHEN** signup mode is `open` and bootstrap is no longer required
- **THEN** signup status reports that open signup is allowed

### Requirement: Instance admin policy UI
An instance admin MUST be able to update signup mode and workspace-related instance policies from a settings surface. Non-admins MUST NOT update them.

#### Scenario: Non-admin denied
- **WHEN** a signed-in non-admin attempts to change signup mode
- **THEN** the system rejects the update
