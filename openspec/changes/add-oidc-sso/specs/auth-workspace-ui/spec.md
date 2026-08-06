## ADDED Requirements

### Requirement: Sign-in offers SSO when available
The sign-in surface MUST show a Continue with SSO action when signup-status reports SSO available. The surface MUST NOT show that action when SSO is unavailable.

#### Scenario: SSO available
- **WHEN** signup-status reports SSO available
- **THEN** the sign-in surface includes a Continue with SSO control
