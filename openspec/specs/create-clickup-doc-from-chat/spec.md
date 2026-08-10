# create-clickup-doc-from-chat Specification

## Purpose
Lets users turn a settled chat reply or thread into a ClickUp Doc through their authorized ClickUp connection, without retyping content into ClickUp by hand.

## Requirements

### Requirement: Create ClickUp Doc from an assistant reply
When an assistant message has finished streaming and has exportable content, the chat UI MUST offer a Create ClickUp Doc action that starts a turn instructing the agent to create a ClickUp document from that message’s Markdown body via ClickUp MCP tools.

#### Scenario: Action starts a create-doc turn
- **WHEN** the user activates Create ClickUp Doc on a settled assistant reply with exportable content
- **AND** ClickUp is available for the current user session
- **THEN** the system sends a user turn that includes the message Markdown and clear instructions to create a ClickUp Doc
- **AND** does not require the user to retype that content

#### Scenario: Action unavailable while streaming
- **WHEN** an assistant message is still streaming
- **THEN** Create ClickUp Doc is not offered for that message

### Requirement: Create ClickUp Doc from the full thread
When the current thread has exportable content, the chat UI MUST offer a Create ClickUp Doc action for the whole conversation that starts a turn using the thread Markdown serialization (same content model as Copy chat).

#### Scenario: Thread create-doc turn
- **WHEN** the user activates Create ClickUp Doc for a non-empty thread
- **AND** ClickUp is available for the current user session
- **THEN** the system sends a user turn that includes the serialized thread Markdown and instructions to create a ClickUp Doc

### Requirement: ClickUp connection gate
If ClickUp is not connected or not enabled for the chat, Create ClickUp Doc MUST NOT silently fail. The UI MUST either disable the action with an explanation or guide the user to connect/enable ClickUp before sending.

#### Scenario: ClickUp not connected
- **WHEN** the user attempts Create ClickUp Doc
- **AND** ClickUp is not connected for the current user
- **THEN** the system does not claim a document was created
- **AND** the user is guided to connect or enable ClickUp

### Requirement: Outcome visible in chat
After Create ClickUp Doc is activated, subsequent assistant/tool output in the same chat MUST be the user’s source of truth for success, failure, and any document link the agent returns. The UI MUST NOT invent a success toast that asserts a ClickUp Doc exists without agent confirmation.

#### Scenario: Agent reports the created doc
- **WHEN** the agent successfully creates a ClickUp Doc and replies with a link or identifier
- **THEN** that reply appears in the chat thread like any other assistant turn
