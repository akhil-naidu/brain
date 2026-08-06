## MODIFIED Requirements

### Requirement: Signed-in browser session
The system MUST allow an operator or user to sign in to the Brain browser UI with a host-local account session backed by Better Auth, using email/password and/or workspace-configured OIDC/SAML SSO (email-domain HRD). The system MUST NOT require Sign in with Vercel, Vercel OIDC, or Vercel Connect for this session.

#### Scenario: Successful sign-in
- **WHEN** a user submits valid credentials on the sign-in surface
- **THEN** the browser receives an authenticated session and can access chat and connection APIs as that user

#### Scenario: Successful SSO sign-in
- **WHEN** SSO is licensed and a user completes company SSO for an email domain with a configured provider
- **THEN** the browser receives an authenticated session for that user

#### Scenario: Failed sign-in
- **WHEN** a user submits invalid credentials
- **THEN** the system rejects the attempt without creating a session and does not expose other users’ data
