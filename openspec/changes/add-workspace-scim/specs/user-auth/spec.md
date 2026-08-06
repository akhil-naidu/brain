## ADDED Requirements

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
