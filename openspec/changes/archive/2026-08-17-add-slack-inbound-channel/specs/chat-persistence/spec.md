## ADDED Requirements

### Requirement: Slack threads persist as personal Brain chats
Each Slack conversation the agent handles (a DM, or a channel thread started by mention) MUST be stored as a personal Brain chat owned by the mapped user in the workspace used for that turn. The chat MUST survive app restarts and MUST appear in that user's sidebar for that workspace. Follow-up Slack messages in the same Slack team, channel, and thread MUST update the same chat rather than creating a duplicate.

#### Scenario: First Slack DM creates a personal chat
- **WHEN** a mapped user sends the first DM to the Brain bot
- **THEN** a personal chat appears in that user's Brain sidebar for the workspace used on the turn

#### Scenario: Same Slack thread resumes one chat
- **WHEN** the same mapped user sends another message in the same Slack DM or thread
- **THEN** the existing Brain chat is updated and a second chat is not created for that thread

#### Scenario: Other users do not see the Slack chat
- **WHEN** user A has a personal Slack-origin chat in workspace W
- **THEN** user B's sidebar in W does not list that chat
