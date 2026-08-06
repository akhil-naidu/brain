## Purpose

Lets workspace owners and admins invite people into a workspace via a shareable invite token so multi-user collaboration works without relying on open public signup alone.

## ADDED Requirements

### Requirement: Create workspace invite
A workspace owner or admin MUST be able to create an invite for their workspace. The invite MUST include a secret token, target workspace id, optional email binding, intended role (default member), and expiry. Members without admin/owner role MUST NOT create invites.

#### Scenario: Admin creates invite link
- **WHEN** a workspace admin creates an invite for their active workspace
- **THEN** the system returns a token (or URL containing it) that can be used to join that workspace before expiry

#### Scenario: Member cannot invite
- **WHEN** a workspace member without admin or owner role attempts to create an invite
- **THEN** the system rejects the attempt

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
