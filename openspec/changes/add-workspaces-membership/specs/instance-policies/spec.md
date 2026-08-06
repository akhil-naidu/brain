## Purpose

Stores host-level Brain policies that control signup and workspace provisioning defaults so cloud, self-host, and enterprise can share one product with different configuration.

## ADDED Requirements

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

### Requirement: Instance admin can update policies
An instance admin MUST be able to read and update these instance policies on the host. Non-instance-admins MUST NOT change instance policies.

#### Scenario: Member cannot change signup mode
- **WHEN** a signed-in user who is not an instance admin attempts to set signup mode
- **THEN** the system rejects the update
