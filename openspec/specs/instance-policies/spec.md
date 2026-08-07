# instance-policies Specification

## Purpose
Instance policies control signup mode and workspace provisioning defaults for the whole Brain host.
## Requirements
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

### Requirement: Signup mode policy
The system MUST persist an instance signup mode of `open` or `invite-only` for this slice (`sso-only` MAY be reserved but MUST NOT be required). Self-host default MUST be `invite-only`. When mode is `invite-only`, open public self-signup MUST be unavailable except via bootstrap (zero users) or invite-driven account creation. When mode is `open`, email/password self-signup MUST be available.

#### Scenario: Invite-only blocks public signup
- **WHEN** signup mode is `invite-only` and at least one user already exists
- **THEN** a public sign-up attempt without a valid invite path is rejected

#### Scenario: Open allows signup
- **WHEN** signup mode is `open`
- **THEN** a new user can create an account via the sign-up surface without an invite

### Requirement: Workspace creation policy
The system MUST support an instance policy that allows or forbids signed-in users creating additional workspaces. When forbidden, only instance-admin-controlled provisioning paths (if any) may create workspaces beyond personal workspace rules.

#### Scenario: Create workspace disabled
- **WHEN** workspace creation policy is disabled and a non-instance-admin member attempts to create a workspace
- **THEN** the system rejects the create

### Requirement: Auto personal workspace policy
The system MUST support an instance policy that enables or disables automatic Personal workspace creation for new users. When enabled, new users receive a Personal workspace per the workspaces capability.

#### Scenario: Policy on creates personal workspace
- **WHEN** auto personal workspace policy is enabled and a new user is created
- **THEN** that user has a Personal workspace

### Requirement: Forgot password policy
The system MUST support an instance policy that allows or forbids self-serve forgot-password email. Default MUST be allowed. When forbidden, public forgot-password requests MUST be rejected while instance-admin password reset remains available.

#### Scenario: Policy off blocks self-serve reset
- **WHEN** allow-forgot-password is disabled
- **THEN** a public forgot-password request is rejected

#### Scenario: Policy on advertises availability
- **WHEN** allow-forgot-password is enabled and signup mode is not `sso-only`
- **THEN** signup-status reports forgot-password as available (email send still requires SMTP)

### Requirement: Instance admin can update policies
An instance admin MUST be able to read and update these instance policies on the host. Non-instance-admins MUST NOT change instance policies.

#### Scenario: Member cannot change signup mode
- **WHEN** a signed-in user who is not an instance admin attempts to set signup mode
- **THEN** the system rejects the update

### Requirement: Policies respect license unlocks
Updating instance signup mode to `open` MUST require the openSignup entitlement. Updating signup mode to `sso-only` MUST require the SSO entitlement. Disabling multi-workspace via license MUST prevent enabling create-workspace policy when the license forbids multi-workspace.

#### Scenario: Open signup blocked by license
- **WHEN** the license has openSignup false and an instance admin sets signup mode to open
- **THEN** the system rejects the policy update

