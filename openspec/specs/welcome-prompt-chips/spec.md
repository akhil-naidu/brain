# welcome-prompt-chips Specification

## Purpose
Helps users start a conversation from the empty chat state with short suggested prompts.
## Requirements
### Requirement: Welcome prompts on empty chat
When the chat has no messages and send is available, the empty state MUST show a small set of suggested prompts. Suggestions MUST NOT replace unavailable-chat guidance.

#### Scenario: Suggestions appear on a ready empty chat
- **WHEN** the thread is empty and chat send is available
- **THEN** the empty state lists suggested prompts

#### Scenario: Suggestions hidden when chat is unavailable
- **WHEN** the empty state is showing that chat is unavailable because setup is incomplete
- **THEN** welcome prompts are not shown

### Requirement: Suggestion starts a turn
Activating a suggestion MUST send that prompt through the same path as a normal composer submit.

#### Scenario: Clicking a suggestion sends it
- **WHEN** the user activates a welcome prompt
- **THEN** the system sends that prompt text as a new turn

### Requirement: Morning brief starter
The empty-state suggestions MUST include a primary morning-brief starter that asks Brain for a short cross-app status summary across enabled, signed-in connections.

#### Scenario: Morning brief is offered first
- **WHEN** welcome prompts are shown on a ready empty chat
- **THEN** the first suggestion is a morning-brief starter (for example “What's waiting on me?”) and is visually emphasized as primary

#### Scenario: Morning brief prompt steers tool use
- **WHEN** the user activates the morning-brief suggestion
- **THEN** the sent prompt asks for a brief across connected work apps and instructs Brain to skip unavailable connections without inventing data

