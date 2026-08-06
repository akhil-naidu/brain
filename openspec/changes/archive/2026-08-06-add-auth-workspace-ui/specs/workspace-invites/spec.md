## Purpose

Invite tokens let workspace admins bring people into a workspace without open public signup.

## ADDED Requirements

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
