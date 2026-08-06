## ADDED Requirements

### Requirement: Transfer workspace ownership
A workspace owner MUST be able to transfer ownership of a **team** workspace to another existing member. After transfer, the target MUST be `owner` and the former owner MUST be `admin`. Transfer MUST be rejected for personal workspaces, non-members, and non-owner actors.

#### Scenario: Owner transfers to member
- **WHEN** the workspace owner transfers ownership to a member of that team workspace
- **THEN** that member becomes owner and the former owner becomes admin

#### Scenario: Non-owner cannot transfer
- **WHEN** a workspace admin attempts to transfer ownership
- **THEN** the system rejects the transfer
