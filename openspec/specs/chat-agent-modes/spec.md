## Purpose

Defines Brain chat agent modes (Ask and Agent): how the user selects them, how the composer signals the active mode, and how each mode constrains tools and agent behavior for a turn.

## Requirements

### Requirement: Chat mode catalog and persistence
The system MUST support chat modes `ask` and `agent`. The selected mode MUST persist across reloads in the existing client preference store (`brain.chatMode`). Unknown or missing values MUST resolve to `agent`.

#### Scenario: User selects Ask mode
- **WHEN** the user chooses Ask in the mode picker
- **THEN** subsequent turns include `mode: "ask"` in turn client context and the preference survives a page reload

#### Scenario: Unknown stored mode
- **WHEN** local storage contains an unrecognized mode string (including legacy `plan` or `debug`)
- **THEN** the UI and turn context use `agent`

### Requirement: Mode-colored composer chrome
While a mode is selected, the chat composer MUST visually distinguish that mode using a stable accent: Ask green, Agent neutral. At minimum the mode control label and the composer border or send control MUST use the active mode accent.

#### Scenario: Switch from Agent to Ask
- **WHEN** the user changes the mode picker from Agent to Ask
- **THEN** the mode control and composer chrome update to the Ask green accent without requiring a page reload

### Requirement: Shift+Tab cycles chat modes
When the composer message input is focused and the command menu is closed, Shift+Tab MUST cycle the chat mode between Ask and Agent and update the persisted preference.

#### Scenario: Cycle mode with Shift+Tab
- **WHEN** the user presses Shift+Tab in the composer while Agent is selected and no command menu is open
- **THEN** the chat mode becomes Ask

### Requirement: Ask mode is plain chat
When the turn mode is Ask, the agent MUST answer in natural language only and MUST NOT receive harness tools for that turn. Turn client context MUST instruct the model not to call tools, shell, or connections.

#### Scenario: Ask turn omits harness tools
- **WHEN** a turn starts with `mode: "ask"`
- **THEN** built-in harness tools are omitted for that step and Ask-mode instructions apply

### Requirement: Ask mode denies connection tools
When the turn mode is Ask, connection/MCP tools MUST be denied even if discovered.

#### Scenario: Ask turn denies a read connection tool
- **WHEN** a turn is in Ask mode and a connection tool is requested
- **THEN** the connection approval decision is denied

### Requirement: Agent mode allows full tools
When the turn mode is Agent, the agent MUST keep harness tools available (subject to existing connection and auth rules). Agent is the default mode.

#### Scenario: Agent turn keeps harness tools
- **WHEN** a turn starts with `mode: "agent"` or with no mode
- **THEN** harness tools remain available subject to existing connection and auth rules

### Requirement: Agent turns apply tool-result screening
When the turn mode is Agent (or Debug), harness and connection tool results MUST be screened according to instance agent safety posture (Auto and Strict screen; Dangerous interactive turns skip). Ask mode MUST continue to omit harness tools and deny connection tools, so screening does not run on Ask.

#### Scenario: Agent Auto screens bash output
- **WHEN** a turn is Agent, posture is `auto`, and bash returns an injection phrase
- **THEN** the model does not receive that output

#### Scenario: Ask still has no tools to screen
- **WHEN** a turn is Ask
- **THEN** harness tools remain omitted and connection tools remain denied regardless of screening rules
