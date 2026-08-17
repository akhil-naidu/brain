## ADDED Requirements

### Requirement: Docs describe agent safety posture and command policy
Customer documentation MUST describe the instance agent safety posture (`strict` / `auto` / `dangerous`), who can change it, that Auto is the default, that Ask and Plan constraints still apply, and that a command policy blocks high-risk shell and destructive SQL in every posture including Dangerous.

#### Scenario: Operator reads instance policies docs
- **WHEN** a visitor opens the instance policies documentation page
- **THEN** the page documents the agent safety posture control on `/settings/instance`

#### Scenario: User reads approvals docs
- **WHEN** a visitor opens the approvals documentation page
- **THEN** the page explains that HITL pauses depend on instance posture and that command-policy denials never become an approve prompt
