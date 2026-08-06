## ADDED Requirements

### Requirement: Policies respect license unlocks
Updating instance signup mode to `open` MUST require the openSignup entitlement. Updating signup mode to `sso-only` MUST require the SSO entitlement. Disabling multi-workspace via license MUST prevent enabling create-workspace policy when the license forbids multi-workspace.

#### Scenario: Open signup blocked by license
- **WHEN** the license has openSignup false and an instance admin sets signup mode to open
- **THEN** the system rejects the policy update
