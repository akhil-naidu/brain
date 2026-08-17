## ADDED Requirements

### Requirement: Slack inbound is interactive not unattended
Inbound Slack Agent turns MUST use the stored instance agent safety posture for HITL, the same as browser chat. They MUST NOT use the unattended schedule exception (forced Auto HITL). Command policy MUST still deny matching calls. Auto and Strict MUST still screen tool results; Dangerous interactive Slack turns skip result screening the same as Dangerous browser turns.

#### Scenario: Strict Slack read waits
- **WHEN** posture is `strict` and a Slack Agent turn calls a reviewed read connection tool
- **THEN** the call requires user approval in Slack

#### Scenario: Dangerous Slack write skips HITL
- **WHEN** posture is `dangerous` and a Slack Agent turn calls a mutating connection tool the command policy allows
- **THEN** the call does not require HITL

#### Scenario: Scheduled runs remain distinct
- **WHEN** a morning-brief schedule runs while Slack inbound is also configured
- **THEN** the schedule still uses unattended Auto HITL and Slack inbound still uses instance posture
