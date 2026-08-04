# welcome-prompt-chips Specification

## Purpose
Helps users start a conversation from the empty chat state with short suggested prompts.
## Requirements
### Requirement: Welcome prompts on empty chat
When the chat has no messages and send is available, the empty state MUST show a small set of suggested prompts. Suggestions MUST NOT replace missing-API-key setup guidance.

#### Scenario: Suggestions appear on a ready empty chat
- **WHEN** the thread is empty and chat send is available
- **THEN** the empty state lists suggested prompts

#### Scenario: Suggestions hidden during setup guidance
- **WHEN** the empty state is showing missing Command Code API key guidance
- **THEN** welcome prompts are not shown

### Requirement: Suggestion starts a turn
Activating a suggestion MUST send that prompt through the same path as a normal composer submit.

#### Scenario: Clicking a suggestion sends it
- **WHEN** the user activates a welcome prompt
- **THEN** the system sends that prompt text as a new turn

