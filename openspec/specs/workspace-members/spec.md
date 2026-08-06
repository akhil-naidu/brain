# workspace-members Specification

## Purpose
Administer workspace membership: see who belongs, change admin/member roles, and remove or leave.
## Requirements
### Requirement: List workspace members
Any member of a workspace MUST be able to list that workspace’s members, including user id, role, and email when available.

#### Scenario: Member sees roster
- **WHEN** a signed-in member requests members for their active workspace
- **THEN** the system returns the membership list for that workspace

### Requirement: Update member role
A workspace owner or admin MUST be able to set another member’s role to `member` or `admin`. The system MUST NOT assign `owner` through this path. Admins MUST NOT change an owner’s role. The last owner MUST NOT be demoted.

#### Scenario: Owner promotes member to admin
- **WHEN** a workspace owner sets a member’s role to admin
- **THEN** that user’s role becomes admin

#### Scenario: Last owner cannot be demoted
- **WHEN** the sole owner’s role would change away from owner
- **THEN** the system rejects the update

### Requirement: Remove or leave membership
A workspace owner MUST be able to remove admins and members. A workspace admin MUST be able to remove members (not owners or admins). A member MUST be able to leave a team workspace unless they are the last owner. Removing the last owner MUST be rejected. Role/remove mutations on personal workspaces MUST be rejected.

#### Scenario: Admin removes member
- **WHEN** a workspace admin removes a member
- **THEN** that user loses membership and can no longer access the workspace

#### Scenario: Last owner cannot leave
- **WHEN** the sole owner attempts to leave
- **THEN** the system rejects the leave

