## ADDED Requirements

### Requirement: Morning brief starter
The empty-state suggestions MUST include a primary morning-brief starter that asks Brain for a short cross-app status summary across enabled, signed-in connections.

#### Scenario: Morning brief is offered first
- **WHEN** welcome prompts are shown on a ready empty chat
- **THEN** the first suggestion is a morning-brief starter (for example “What's waiting on me?”) and is visually emphasized as primary

#### Scenario: Morning brief prompt steers tool use
- **WHEN** the user activates the morning-brief suggestion
- **THEN** the sent prompt asks for a brief across connected work apps and instructs Brain to skip unavailable connections without inventing data
