# user-auth Specification

## Purpose

Provides self-hosted browser login sessions for Brain and binds chat, eve turns, and MCP OAuth to the signed-in user instead of a shared anonymous principal.
## Requirements
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

### Requirement: Sign-out ends the session
The system MUST provide a way to sign out that clears the browser session so subsequent protected requests are unauthenticated.

#### Scenario: Sign-out
- **WHEN** a signed-in user signs out
- **THEN** chat history and connection APIs treat the caller as unauthenticated until they sign in again

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
A fresh Brain host with no users MUST provide a bootstrap path to create the first account without open public self-signup for arbitrary strangers. That first account MUST become an instance admin and MUST receive workspace membership (Personal workspace when auto personal policy is enabled). After bootstrap, public registration MUST follow the instance signup mode policy (default `invite-only`).

#### Scenario: First operator creation
- **WHEN** the host has zero user accounts and an authorized bootstrap action creates the first account
- **THEN** that account can sign in as instance admin, has a workspace membership, and open public registration remains unavailable when signup mode is `invite-only`

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
- **WHEN** signup mode is `open` and a visitor completes the sign-up form
- **THEN** a user account is created and they can access the authenticated app

### Requirement: Invite path creates users under invite-only
When signup mode is `invite-only`, Brain MUST still allow account creation through a valid workspace invite registration path.

#### Scenario: Invite register under invite-only
- **WHEN** a visitor uses a valid invite registration path with email and password
- **THEN** the account is created despite invite-only public signup being disabled

### Requirement: Signup follows instance policy
After the first user exists, email/password self-signup MUST be allowed only when instance signup mode is `open`, or when an invite-driven registration path explicitly creates the account. The system MUST NOT require Vercel auth products for signup.

#### Scenario: Open signup creates user
- **WHEN** signup mode is `open` and a visitor completes sign-up with valid email and password
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


