## ADDED Requirements

### Requirement: Safety posture does not override Ask or Plan tool constraints
Ask mode MUST continue to omit harness tools and deny connection tools regardless of instance agent safety posture. Plan mode MUST continue to omit mutating harness tools and deny mutating connection tools regardless of posture, including `dangerous`. Command policy MUST still deny matching calls in Agent and Debug.

#### Scenario: Ask ignores Dangerous
- **WHEN** posture is `dangerous` and a turn starts with `mode: "ask"`
- **THEN** harness tools remain omitted and connection tools remain denied

#### Scenario: Plan ignores Dangerous
- **WHEN** posture is `dangerous` and a turn starts with `mode: "plan"`
- **THEN** write-file and bash remain omitted and mutating connection tools remain denied

## MODIFIED Requirements

### Requirement: Agent mode allows full tools
When the turn mode is Agent, the agent MUST keep harness tools available (subject to existing connection and auth rules, instance agent safety posture, and command policy). Agent is the default mode.

#### Scenario: Agent turn keeps harness tools
- **WHEN** a turn starts with `mode: "agent"` or with no mode
- **THEN** harness tools remain available subject to existing connection and auth rules, instance agent safety posture, and command policy
