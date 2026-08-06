# license-entitlements Specification

## Purpose
Host license keys unlock SKU entitlements that constrain instance policies and capacity.

## Requirements

### Requirement: Resolve license entitlements
Brain MUST resolve entitlements from an optional installed license key. When no valid license is installed, entitlements MUST default to unlocked (unlimited users and all commercial features available). Expired or invalid signatures MUST NOT grant entitlements beyond the unlicensed default when clearing is required — invalid paste MUST be rejected without replacing a previously valid license unless explicitly cleared.

#### Scenario: Unlicensed host is unlocked
- **WHEN** no license key is installed
- **THEN** entitlements allow unlimited users and all feature unlocks (SSO available, multi-workspace, BYOA, open signup)

#### Scenario: Valid license applies caps
- **WHEN** a valid signed license with `maxUsers: 5` is installed
- **THEN** entitlement resolution reports maxUsers 5

### Requirement: Instance admin manages license key
An instance admin MUST be able to install or clear a license key from a settings surface. Non-admins MUST NOT mutate the license.

#### Scenario: Admin installs key
- **WHEN** an instance admin submits a valid license key
- **THEN** the host stores it and subsequent entitlement reads use that license

#### Scenario: Non-admin denied
- **WHEN** a signed-in non-admin attempts to install a license key
- **THEN** the system rejects the mutation

### Requirement: Enforce max users
When maxUsers is a finite number, Brain MUST reject creating additional user accounts via open signup or invite registration once the user count reaches that limit. Bootstrap of the first user MUST still succeed when the host has zero users.

#### Scenario: Invite register blocked at cap
- **WHEN** maxUsers is 1 and one user already exists
- **THEN** invite registration for a second user is rejected
