## ADDED Requirements

### Requirement: Auth data persists in Postgres
Better Auth user, session, account, verification, and related auth tables MUST be stored in the operator-configured Postgres database. The system MUST NOT use `.eve/brain-auth.sqlite` (or other host SQLite files) as the auth store when Postgres is configured. The system MUST NOT require Sign in with Vercel, Vercel OIDC, Vercel Connect, Neon, or Supabase Auth for this persistence.

#### Scenario: Session survives restart via Postgres
- **WHEN** a user signs in and the app server process restarts with the same Postgres database
- **THEN** a still-valid session cookie continues to authenticate that user

#### Scenario: SQLite auth files are not used
- **WHEN** Brain is running with Postgres configured
- **THEN** auth persistence does not read or write `.eve/brain-auth.sqlite`

## MODIFIED Requirements

### Requirement: Signed-in browser session
The system MUST allow an operator or user to sign in to the Brain browser UI with an account session backed by Better Auth on the instance Postgres database, using email/password and/or workspace-configured OIDC/SAML SSO (email-domain HRD). The system MUST NOT require Sign in with Vercel, Vercel OIDC, or Vercel Connect for this session.

#### Scenario: Successful sign-in
- **WHEN** a user submits valid credentials on the sign-in surface
- **THEN** the browser receives an authenticated session and can access chat and connection APIs as that user

#### Scenario: Successful SSO sign-in
- **WHEN** SSO is licensed and a user completes company SSO for an email domain with a configured provider
- **THEN** the browser receives an authenticated session for that user

#### Scenario: Failed sign-in
- **WHEN** a user submits invalid credentials
- **THEN** the system rejects the attempt without creating a session and does not expose other users’ data
