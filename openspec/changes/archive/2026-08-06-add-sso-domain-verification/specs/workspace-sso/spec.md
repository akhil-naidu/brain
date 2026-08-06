## MODIFIED Requirements

### Requirement: Workspace owner configures SSO provider
A team workspace owner or admin MUST be able to create, update, and delete an OIDC or SAML SSO provider for that workspace from workspace settings. Personal workspaces MUST NOT expose SSO configuration. Members who are not owner/admin MUST NOT mutate providers. Mutations MUST require the instance SSO license entitlement. New or domain-changed providers MUST start as domain-unverified until DNS verification succeeds.

#### Scenario: Admin saves OIDC provider
- **WHEN** a workspace admin submits a valid OIDC provider for a team workspace and SSO is licensed
- **THEN** the provider is stored linked to that workspace id and listed in workspace settings as unverified until domain verification completes

#### Scenario: Member denied
- **WHEN** a workspace member attempts to save an SSO provider
- **THEN** the system rejects the mutation
