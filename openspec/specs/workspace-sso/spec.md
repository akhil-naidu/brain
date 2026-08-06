# workspace-sso Specification

## Purpose
Team workspaces configure their own OIDC/SAML IdP; visitors sign in via email-domain SSO and join the linked workspace.

## Requirements

### Requirement: Workspace owner configures SSO provider
A team workspace owner or admin MUST be able to create, update, and delete an OIDC or SAML SSO provider for that workspace from workspace settings. Personal workspaces MUST NOT expose SSO configuration. Members who are not owner/admin MUST NOT mutate providers. Mutations MUST require the instance SSO license entitlement. New or domain-changed providers MUST start as domain-unverified until DNS verification succeeds.

#### Scenario: Admin saves OIDC provider
- **WHEN** a workspace admin submits a valid OIDC provider for a team workspace and SSO is licensed
- **THEN** the provider is stored linked to that workspace id and listed in workspace settings as unverified until domain verification completes

#### Scenario: Member denied
- **WHEN** a workspace member attempts to save an SSO provider
- **THEN** the system rejects the mutation

### Requirement: Email domains are unique on the host
Each email domain used for SSO HRD MUST map to at most one provider on the host.

#### Scenario: Domain conflict rejected
- **WHEN** workspace A already uses domain `acme.com` and workspace B tries to claim `acme.com`
- **THEN** the system rejects workspace B’s save

### Requirement: Sign in via domain HRD
When SSO is licensed, the sign-in surface MUST allow continuing with company SSO using the visitor’s email so Better Auth can route to the matching provider domain.

#### Scenario: Company SSO starts
- **WHEN** a visitor enters an email whose domain matches a configured provider and chooses company SSO
- **THEN** the browser is redirected to that provider’s IdP

### Requirement: SSO provisions workspace membership
When a user signs in through a provider linked to a workspace id, Brain MUST ensure that user is a member of that workspace (default role member if newly added) and SHOULD set it as active when the user has no active workspace.

#### Scenario: New SSO user joins workspace
- **WHEN** an unknown user completes SSO for a provider linked to workspace W
- **THEN** a Brain user exists and is a member of W
