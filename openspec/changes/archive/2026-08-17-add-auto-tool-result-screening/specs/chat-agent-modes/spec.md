## ADDED Requirements

### Requirement: Agent turns apply tool-result screening
When the turn mode is Agent (or Debug), harness and connection tool results MUST be screened according to instance agent safety posture (Auto and Strict screen; Dangerous interactive turns skip). Ask mode MUST continue to omit harness tools and deny connection tools, so screening does not run on Ask.

#### Scenario: Agent Auto screens bash output
- **WHEN** a turn is Agent, posture is `auto`, and bash returns an injection phrase
- **THEN** the model does not receive that output

#### Scenario: Ask still has no tools to screen
- **WHEN** a turn is Ask
- **THEN** harness tools remain omitted and connection tools remain denied regardless of screening rules
