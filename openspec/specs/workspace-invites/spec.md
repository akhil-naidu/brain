# workspace-invites Specification

## Purpose
Invite tokens let workspace admins bring people into a workspace without open public signup.
## Requirements
### Requirement: Invite-driven registration
A valid unexpired invite MUST allow a new user to register with email and password even when signup mode is `invite-only`. Registration MUST accept the invite in the same flow and MUST NOT succeed for revoked or expired tokens.

#### Scenario: Register under invite-only
- **WHEN** signup mode is `invite-only` and a visitor registers with a valid invite token
- **THEN** the account is created and membership in the invite’s workspace is granted

#### Scenario: Invalid token rejected
- **WHEN** a visitor attempts register with a revoked or unknown token
- **THEN** the system rejects registration without creating membership

### Requirement: Existing session accept
A signed-in user MUST be able to accept a valid invite for their account (subject to optional email binding).

#### Scenario: Accept while signed in
- **WHEN** a signed-in user accepts a valid invite
- **THEN** they gain membership and may use that workspace as active

### Requirement: Create workspace invite
A workspace owner or admin MUST be able to create an invite for their workspace. The invite MUST include a secret token, target workspace id, optional email binding, intended role (default member), and expiry. Members without admin/owner role MUST NOT create invites.

#### Scenario: Admin creates invite link
- **WHEN** a workspace admin creates an invite for their active workspace
- **THEN** the system returns a token (or URL containing it) that can be used to join that workspace before expiry

#### Scenario: Member cannot invite
- **WHEN** a workspace member without admin or owner role attempts to create an invite
- **THEN** the system rejects the attempt

### Requirement: Create invite reports email delivery status
When creating an invite with a bound email, the create response MUST include whether an invite email was sent (and a short reason when not).

#### Scenario: Status fields present
- **WHEN** an admin creates an invite with an email
- **THEN** the response includes `emailSent` boolean information for the UI

### Requirement: Accept invite joins workspace
Accepting a valid, unexpired invite MUST add the accepting user as a member of the invite’s workspace with the invite’s role (or member if unspecified). If the invite binds an email, the accepting account’s email MUST match. Accepting MUST NOT remove the user’s Personal workspace membership.

#### Scenario: Existing user accepts invite
- **WHEN** a signed-in user accepts a valid invite for workspace W
- **THEN** they become a member of W and can switch to W as the active workspace while retaining prior workspace memberships

#### Scenario: Email mismatch rejected
- **WHEN** an invite is bound to email A and a user with email B attempts to accept it
- **THEN** the system rejects the accept without granting membership

### Requirement: Revoke invite
A workspace owner or admin MUST be able to revoke an outstanding invite so the token can no longer be accepted.

#### Scenario: Revoked invite fails
- **WHEN** an invite is revoked and a user attempts to accept it
- **THEN** the system rejects the accept

