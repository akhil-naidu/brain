## Purpose

Host OIDC single sign-on for Brain browser sessions using a configured identity provider.

## ADDED Requirements

### Requirement: Configure host OIDC provider
Brain MUST support configuring a single host OIDC provider via environment variables (discovery URL or issuer, client id, client secret). When discovery/issuer and client credentials are present and the SSO license entitlement allows it, Brain MUST enable OIDC sign-in.

#### Scenario: Incomplete config disables SSO
- **WHEN** client id or client secret is missing
- **THEN** SSO is not offered to browsers

#### Scenario: License without SSO disables plugin surface
- **WHEN** a license has SSO false
- **THEN** SSO is not offered even if OIDC env vars are set

### Requirement: Sign in with OIDC
Visitors MUST be able to start an OIDC authorization-code sign-in from the sign-in surface when SSO is available. Successful callback MUST establish a Better Auth session mapped to an eve user principal.

#### Scenario: SSO button starts OAuth
- **WHEN** SSO is available and the visitor chooses Continue with SSO
- **THEN** the browser is redirected to the configured IdP authorization endpoint

### Requirement: SSO user creation follows signup mode
When signup mode is `invite-only`, OIDC MUST NOT create a new user account for an unknown identity (existing users may still sign in). When signup mode is `open` or `sso-only`, OIDC MAY create a new user subject to license maxUsers and personal-workspace policies.

#### Scenario: Invite-only blocks JIT
- **WHEN** signup mode is `invite-only` and an unknown IdP user completes OIDC
- **THEN** no new Brain user is created

#### Scenario: SSO-only allows JIT
- **WHEN** signup mode is `sso-only` and an unknown IdP user completes OIDC under an unlocked license
- **THEN** a Brain user account is created and can use the app
