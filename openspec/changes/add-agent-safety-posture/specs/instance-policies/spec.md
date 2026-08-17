## ADDED Requirements

### Requirement: Agent safety posture policy
The system MUST persist an instance agent safety posture of `strict`, `auto`, or `dangerous` with the other instance policies. Default MUST be `auto`. An instance admin MUST be able to read and update it from the instance settings surface. Signed-in non-admins MUST be able to read the current posture and MUST NOT update it.

#### Scenario: Admin sets Strict
- **WHEN** an instance admin sets agent safety posture to `strict`
- **THEN** the stored instance policy reports `strict` and later reads return `strict`

#### Scenario: Non-admin cannot change posture
- **WHEN** a signed-in user who is not an instance admin attempts to set agent safety posture
- **THEN** the system rejects the update

#### Scenario: Member can read posture
- **WHEN** a signed-in non-admin requests instance policies
- **THEN** the response includes the current agent safety posture
