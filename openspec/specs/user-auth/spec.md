# user-auth Specification

## Purpose

Provides self-hosted browser login sessions for Brain and binds chat, eve turns, and MCP OAuth to the signed-in user instead of a shared anonymous principal.
## Requirements
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

### Requirement: Auth data persists in Postgres
Better Auth user, session, account, verification, and related auth tables MUST be stored in the operator-configured Postgres database. The system MUST NOT use `.eve/brain-auth.sqlite` (or other host SQLite files) as the auth store when Postgres is configured. The system MUST NOT require Sign in with Vercel, Vercel OIDC, Vercel Connect, Neon, or Supabase Auth for this persistence.

#### Scenario: Session survives restart via Postgres
- **WHEN** a user signs in and the app server process restarts with the same Postgres database
- **THEN** a still-valid session cookie continues to authenticate that user

#### Scenario: SQLite auth files are not used
- **WHEN** Brain is running with Postgres configured
- **THEN** auth persistence does not read or write `.eve/brain-auth.sqlite`

### Requirement: Sign-out ends the session
The system MUST provide a way to sign out that clears the browser session so subsequent protected requests are unauthenticated.

#### Scenario: Sign-out
- **WHEN** a signed-in user signs out
- **THEN** chat history and connection APIs treat the caller as unauthenticated until they sign in again

### Requirement: Self-serve forgot password
When instance policy allows forgot-password and signup mode is not `sso-only`, Brain MUST offer a forgot-password flow. Successful email delivery requires SMTP; when SMTP is missing the API MUST return a clear configuration error without revealing whether the address exists. When the policy is off or the host is SSO-only, self-serve forgot-password MUST be unavailable in the UI and blocked by the API. Instance admins MUST still be able to set a user’s password.

#### Scenario: Forgot password available
- **WHEN** allow-forgot-password is on and mode is not `sso-only`
- **THEN** sign-in shows a forgot-password control

#### Scenario: Forgot password blocked by policy
- **WHEN** allow-forgot-password is off
- **THEN** requesting a reset is rejected and sign-in does not offer forgot-password

#### Scenario: SMTP missing
- **WHEN** forgot-password is allowed but SMTP is not configured
- **THEN** the forgot-password request fails with a clear configuration error

#### Scenario: Reset via email token
- **WHEN** a visitor opens a valid reset link and submits a new password
- **THEN** the password is updated and existing sessions for that user are revoked

### Requirement: Signed-in user can change password
A signed-in user with a credential password MUST be able to change that password from the account profile surface, optionally revoking other sessions.

#### Scenario: Change password while signed in
- **WHEN** a signed-in user submits current and new passwords on the account profile surface
- **THEN** the password is updated for subsequent email sign-in

### Requirement: Instance admin can reset user password
An instance admin MUST be able to set or reset any host user’s password from instance settings, including users who currently have no credential password. The reset MUST revoke that user’s sessions. Non-admins MUST NOT reset other users’ passwords.

#### Scenario: Admin resets password
- **WHEN** an instance admin sets a new password for a user
- **THEN** that user can sign in with the new password and prior sessions for that user end

#### Scenario: Non-admin denied
- **WHEN** a signed-in non-admin attempts to reset another user’s password
- **THEN** the system rejects the request

### Requirement: User can manage active sessions
The system MUST let a signed-in user list their active Better Auth sessions and revoke individual other sessions, all other sessions, or every session (including the current one). The current session MUST be identifiable in the UI. The system MUST NOT require a third-party device-management service for this capability.

#### Scenario: List sessions
- **WHEN** a signed-in user opens the sessions surface
- **THEN** the UI shows their active sessions with enough detail to distinguish devices (for example user agent summary and last active time)

#### Scenario: Revoke another session
- **WHEN** a signed-in user revokes a session that is not the current one
- **THEN** that session can no longer access protected APIs and the current session remains signed in

#### Scenario: Sign out other devices
- **WHEN** a signed-in user chooses to revoke all other sessions
- **THEN** other sessions end while the current browser session remains authenticated

#### Scenario: Sign out everywhere
- **WHEN** a signed-in user revokes all sessions including the current one
- **THEN** the current browser becomes unauthenticated and must sign in again

### Requirement: Unauthenticated access is denied for protected surfaces
Chat history APIs, eve browser chat sessions, and connection authorize/status/disconnect endpoints MUST require an authenticated session. Unauthenticated callers MUST NOT act as a shared anonymous chat principal.

#### Scenario: Unauthenticated chat list
- **WHEN** a client without a valid session requests the chats collection
- **THEN** the system rejects the request (unauthorized or equivalent) and does not return another user’s chats

#### Scenario: Unauthenticated eve session create
- **WHEN** a client without a valid session attempts to create an eve chat session for the Brain UI
- **THEN** the system rejects the request instead of binding it to a shared anonymous user

### Requirement: Bootstrap initial account
A fresh Brain host with no users MUST provide a bootstrap path to create the first account without open public self-signup for arbitrary strangers. That first account MUST become an instance admin and MUST receive workspace membership (Personal workspace when auto personal policy is enabled). After bootstrap, public registration MUST follow the instance signup mode policy (default `invite-only`). Bootstrap MUST collect a display name (not derived from email).

#### Scenario: First operator creation
- **WHEN** the host has zero user accounts and an authorized bootstrap action creates the first account with name, email, and password
- **THEN** that account can sign in as instance admin, has a workspace membership, stores the provided display name, and open public registration remains unavailable when signup mode is `invite-only`

### Requirement: Account display name
Email/password account creation paths (open signup, invite registration, and bootstrap) MUST require a trimmed display name of 1–80 characters and MUST NOT default the name to the email address. A signed-in user MUST be able to update their display name from the account profile surface. Email MUST remain read-only on that surface for this capability.

#### Scenario: Open signup stores display name
- **WHEN** a visitor completes open sign-up with a name, email, and password
- **THEN** the created user has that display name (not the email)

#### Scenario: Profile name update
- **WHEN** a signed-in user saves a valid new display name on the account profile surface
- **THEN** subsequent session and people UI surfaces show the updated name

### Requirement: Session maps to eve user principal
Each authenticated Brain session MUST map to a stable eve user principal (`principalType` user with a stable user id) used for MCP OAuth token storage and agent authorization. Resolution of workspace-scoped grants and data MUST also use the session’s active workspace id.

#### Scenario: Principal is stable across reloads
- **WHEN** the same user signs in again after a reload
- **THEN** MCP connection tokens and per-user chat records continue to resolve to that same principal id within the active workspace

#### Scenario: Active workspace included
- **WHEN** a signed-in user has selected an active workspace
- **THEN** eve turns and connection grant lookup use that workspace id together with the user principal

### Requirement: Sign-up page when open
When instance signup mode is `open`, Brain MUST expose a browser sign-up flow that creates an email/password user via Better Auth (not Vercel auth). When mode is `invite-only`, public sign-up without an invite MUST remain unavailable.

#### Scenario: Open signup from UI
- **WHEN** signup mode is `open` and a visitor completes the sign-up form with name, email, and password
- **THEN** a user account is created with that display name and they can access the authenticated app

### Requirement: Invite path creates users under invite-only
When signup mode is `invite-only`, Brain MUST still allow account creation through a valid workspace invite registration path.

#### Scenario: Invite register under invite-only
- **WHEN** a visitor uses a valid invite registration path with name, email, and password
- **THEN** the account is created despite invite-only public signup being disabled

### Requirement: Signup follows instance policy
After the first user exists, email/password self-signup MUST be allowed only when instance signup mode is `open`, or when an invite-driven registration path explicitly creates the account. The system MUST NOT require Vercel auth products for signup.

#### Scenario: Open signup creates user
- **WHEN** signup mode is `open` and a visitor completes sign-up with valid name, email, and password
- **THEN** a user account is created and can sign in

### Requirement: Instance admin distinct from workspace admin
The system MUST treat instance admin as a host-level role separate from workspace owner/admin. Instance admins MAY manage instance policies; workspace admins manage only their workspace membership and invites.

#### Scenario: Workspace admin is not instance admin
- **WHEN** a user is workspace admin but not instance admin
- **THEN** they can invite to that workspace but cannot change host signup mode

### Requirement: Auth route supports SCIM methods
The Better Auth catch-all route MUST accept GET, POST, PUT, PATCH, and DELETE so SCIM 2.0 User operations can complete.

#### Scenario: SCIM PUT accepted
- **WHEN** an IdP sends a PUT to a SCIM Users path with a valid bearer token
- **THEN** the request is not rejected solely for an unsupported HTTP method

### Requirement: SCIM may create users under restrictive signup modes
When a request is authenticated as SCIM provisioning, Brain MUST allow user creation even if signup mode is `invite-only` or `sso-only`, subject to license maxUsers and SSO entitlement.

#### Scenario: Invite-only host accepts SCIM create
- **WHEN** signup mode is `invite-only` and SCIM creates a new user with a valid token
- **THEN** the user account is created


