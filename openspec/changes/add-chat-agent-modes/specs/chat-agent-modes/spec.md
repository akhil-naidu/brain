## Purpose

Defines Brain chat agent modes (Ask, Agent, Plan, Debug): how the user selects them, how the composer signals the active mode, and how each mode constrains tools and agent behavior for a turn.

## ADDED Requirements

### Requirement: Chat mode catalog and persistence
The system MUST support chat modes `ask`, `agent`, `plan`, and `debug`. The selected mode MUST persist across reloads in the existing client preference store (`brain.chatMode`). Unknown or missing values MUST resolve to `agent`.

#### Scenario: User selects Plan mode
- **WHEN** the user chooses Plan in the mode picker
- **THEN** subsequent turns include `mode: "plan"` in turn client context and the preference survives a page reload

#### Scenario: Unknown stored mode
- **WHEN** local storage contains an unrecognized mode string
- **THEN** the UI and turn context use `agent`

### Requirement: Mode-colored composer chrome
While a mode is selected, the chat composer MUST visually distinguish that mode using a stable accent: Ask green, Agent neutral, Plan amber/yellow, Debug red/orange. At minimum the mode control label and the composer border or send control MUST use the active mode accent.

#### Scenario: Switch from Agent to Ask
- **WHEN** the user changes the mode picker from Agent to Ask
- **THEN** the mode control and composer chrome update to the Ask green accent without requiring a page reload

#### Scenario: Switch to Plan and Debug
- **WHEN** the user selects Plan or Debug
- **THEN** the composer chrome uses the Plan amber or Debug red/orange accent respectively

### Requirement: Ask mode is plain chat
When the turn mode is Ask, the agent MUST answer in natural language only and MUST NOT receive harness tools for that turn. Turn client context MUST instruct the model not to call tools, shell, or connections.

#### Scenario: Ask turn omits harness tools
- **WHEN** a turn starts with `mode: "ask"`
- **THEN** built-in harness tools are omitted for that step and Ask-mode instructions apply

### Requirement: Agent mode allows full tools
When the turn mode is Agent, the agent MUST keep harness tools available (subject to existing connection and auth rules). Agent is the default mode.

#### Scenario: Agent turn keeps harness tools
- **WHEN** a turn starts with `mode: "agent"` or with no mode
- **THEN** harness tools remain available subject to existing connection and auth rules

### Requirement: Plan mode researches then plans
When the turn mode is Plan, the agent MUST produce a structured plan and MUST NOT implement changes in that turn. Read/research harness tools MUST remain available; mutating harness tools (write file and bash) MUST be omitted. Turn guidance MUST tell the user to switch to Agent to implement.

#### Scenario: Plan turn blocks writes
- **WHEN** a turn starts with `mode: "plan"`
- **THEN** write-file and bash harness tools are omitted, research tools remain available, and Plan-mode instructions apply

### Requirement: Debug mode is evidence-first
When the turn mode is Debug, harness tools MUST remain available. The agent MUST prioritize hypotheses, gathering runtime or log evidence, and targeted fixes over speculative large changes, per Debug-mode instructions.

#### Scenario: Debug turn keeps tools with debug guidance
- **WHEN** a turn starts with `mode: "debug"`
- **THEN** harness tools remain available and Debug-mode instructions apply
