# auth-workspace-ui Specification

## Purpose
Browser surfaces so operators and members can complete signup, invites, workspace switching, and instance policy changes without using raw APIs.
## Requirements
### Requirement: Open signup page
When instance signup mode is `open`, Brain MUST provide a `/sign-up` page that creates an email/password account. When mode is not `open`, `/sign-up` MUST explain that signup is closed and link to sign-in (and setup when bootstrap is allowed).

#### Scenario: Open mode shows form
- **WHEN** signup mode is `open` and a visitor opens `/sign-up`
- **THEN** they can submit email and password to create an account and reach the app

#### Scenario: Invite-only blocks form
- **WHEN** signup mode is `invite-only` and a visitor opens `/sign-up`
- **THEN** the page does not create an account via public signup and directs them to sign-in or an invite link

### Requirement: Invite landing page
Brain MUST provide `/invite/[token]` where a visitor can join the workspace. Signed-in users MAY accept immediately. New users MUST be able to set a password (and email when not bound) to register and join in one flow.

#### Scenario: Signed-in accept
- **WHEN** a signed-in user opens a valid invite URL and confirms
- **THEN** they join the workspace and land in the app with that workspace active

#### Scenario: New user register via invite
- **WHEN** a logged-out visitor completes the invite register form with a valid token
- **THEN** an account is created, membership is granted, and they can use the app

### Requirement: Instance settings page
Instance admins MUST have a settings page to view and update signup mode, allow-create-workspace, and auto-personal-workspace policies. Non-admins MUST NOT change those policies.

#### Scenario: Admin updates signup mode
- **WHEN** an instance admin sets signup mode to `open` from instance settings
- **THEN** subsequent visitors can use `/sign-up`

### Requirement: Workspace settings invites UI
Workspace owners and admins MUST be able to create invite links, copy them, and revoke outstanding invites from a workspace settings surface.

#### Scenario: Admin copies invite link
- **WHEN** a workspace admin creates an invite
- **THEN** the UI shows a shareable URL containing the invite token

### Requirement: Workspace switcher and create dialog
Signed-in users MUST see the active workspace and be able to switch among memberships. Creating a workspace MUST use an in-app dialog (not `window.prompt`) when create-workspace policy allows.

#### Scenario: Create workspace via dialog
- **WHEN** a user allowed to create workspaces opens New workspace, enters a name, and confirms
- **THEN** a team workspace is created, becomes active, and the chat UI reloads in that workspace

### Requirement: Sign-in offers company SSO when licensed
The sign-in surface MUST show a Continue with company SSO action when the SSO license entitlement allows SSO. The action MUST collect or use an email for domain-based IdP routing.

#### Scenario: SSO licensed
- **WHEN** signup-status reports SSO available
- **THEN** the sign-in surface includes a company SSO control

### Requirement: Workspace settings SSO section
Team workspace settings MUST show SSO configuration for owner/admin viewers when SSO is licensed.

#### Scenario: Team admin sees SSO section
- **WHEN** an owner/admin opens settings for a team workspace and SSO is licensed
- **THEN** the surface includes controls to manage OIDC/SAML providers for that workspace

