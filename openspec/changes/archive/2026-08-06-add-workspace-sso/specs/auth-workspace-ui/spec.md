## ADDED Requirements

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
