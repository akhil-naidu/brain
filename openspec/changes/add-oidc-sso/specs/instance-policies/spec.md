## MODIFIED Requirements

### Requirement: Signup mode policy
The system MUST persist an instance signup mode of `open`, `invite-only`, or `sso-only`. Self-host default MUST be `invite-only`. When mode is `invite-only`, open public self-signup MUST be unavailable except via bootstrap (zero users) or invite-driven account creation. When mode is `open`, email/password self-signup MUST be available. When mode is `sso-only`, public email/password signup and password sign-in MUST be unavailable after bootstrap; new accounts MUST come from OIDC JIT (when SSO is configured) or invite-driven paths that the host still supports for recovery.

#### Scenario: Invite-only blocks public signup
- **WHEN** signup mode is `invite-only` and at least one user already exists
- **THEN** a public sign-up attempt without a valid invite path is rejected

#### Scenario: Open allows signup
- **WHEN** signup mode is `open`
- **THEN** a new user can create an account via the sign-up surface without an invite

#### Scenario: SSO-only hides password sign-in after bootstrap
- **WHEN** signup mode is `sso-only`, bootstrap is not allowed, and the visitor opens sign-in
- **THEN** the password form is not offered and SSO is the primary sign-in path when configured
