## ADDED Requirements

### Requirement: Slack inbound turns use Agent mode
Turns started from Slack DMs or @mentions MUST run with Agent mode (harness and connection tools subject to instance posture, command policy, and tool-result screening). They MUST NOT default to Ask. Ask and Plan omit/deny rules MUST still apply if a Slack turn is explicitly Ask or Plan.

#### Scenario: Slack DM is Agent
- **WHEN** a mapped user DMs the Brain bot with no mode override
- **THEN** harness tools remain available subject to posture, command policy, and screening

#### Scenario: Slack cannot weaken Ask
- **WHEN** a Slack turn is in Ask mode
- **THEN** harness tools remain omitted and connection tools remain denied regardless of posture
