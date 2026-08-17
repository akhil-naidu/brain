## ADDED Requirements

### Requirement: Connection tool results are screened before the model
For MCP connection tools that execute, the system MUST apply instance Auto/Strict tool-result screening before the model consumes the output. Dangerous interactive turns MUST skip that screening. A screening match MUST replace the payload with a stub and MUST NOT become an approval prompt.

#### Scenario: Auto blocks an injected ClickUp description
- **WHEN** posture is `auto` and `clickup_get_task` (or another reviewed read) returns a description that tells the model to ignore previous instructions
- **THEN** the model does not receive that description text

#### Scenario: Dangerous ClickUp read is not screened
- **WHEN** posture is `dangerous` on an interactive Agent turn and the same ClickUp read returns an injection phrase
- **THEN** screening does not replace that payload for the model
