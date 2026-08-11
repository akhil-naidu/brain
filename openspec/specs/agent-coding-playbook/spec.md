## Purpose

Defines Brain’s Cursor-class Agent playbook: dual-path behavior (chat/MCP work vs attached-repo coding), standing instruction rules, and load-on-demand skills — without turning Brain into an IDE.

## Requirements

### Requirement: Dual-path Agent identity
Standing Agent instructions MUST describe Brain as a browser chat agent with optional MCP work connections, not as an IDE. When no repository is attached, Agent MUST prefer natural-language answers and MCP tools only when the user clearly needs an external work system. When a repository is attached, Agent MUST treat the sandbox checkout as the primary coding workspace.

#### Scenario: Standing instructions name dual paths
- **WHEN** the agent’s always-on instructions are loaded for an Agent turn
- **THEN** they distinguish attached-repo coding from chat-plus-MCP work and MUST NOT claim IDE features (open editors, LSP panels, inline apply)

#### Scenario: No repo attached stays work-oriented
- **WHEN** an Agent turn has no attached repository in client context
- **THEN** standing instructions still discourage inventing connection use and do not require harness coding steps

### Requirement: Attached-repo coding loop guidance
When a repository is attached and the turn is Agent mode, dynamic instructions MUST require a coding loop: explore with harness tools under `/workspace`, make focused edits, verify with available checks when reasonable, then summarize changes. Routine file edits MUST use harness tools; GitHub MCP MUST be reserved for remote operations (issues, pull requests, reviews, notifications).

#### Scenario: Attached repo turn gets coding loop
- **WHEN** an Agent turn includes an attached repository in client context
- **THEN** dynamic instructions include explore → edit → verify → summarize guidance and prefer `/workspace` harness tools over GitHub MCP for local edits

### Requirement: Brain skills catalog
The agent MUST ship load-on-demand skills under the agent skills directory for at least: coding on an attached repo, morning brief / cross-app status, and opening a pull request from the sandbox checkout. Each skill MUST advertise a task-oriented description so the model can load it via `load_skill` when relevant. Skills MUST add procedure text only — they MUST NOT introduce new execution surfaces.

#### Scenario: Coding skill is loadable
- **WHEN** the agent runtime advertises skills
- **THEN** a skill for coding on an attached repository is available to load with `load_skill`

#### Scenario: Morning brief skill is loadable
- **WHEN** the agent runtime advertises skills
- **THEN** a skill for morning brief or cross-app status is available to load with `load_skill`

#### Scenario: Open-PR skill is loadable
- **WHEN** the agent runtime advertises skills
- **THEN** a skill for opening a pull request from the sandbox checkout is available to load with `load_skill`

### Requirement: Ask mode unchanged by playbook
Ask mode MUST remain plain chat with no harness tools and no connection tools. The coding playbook and skills MUST NOT restore Plan or Debug modes.

#### Scenario: Ask turn ignores coding playbook tools
- **WHEN** a turn starts with `mode: "ask"`
- **THEN** harness tools remain omitted and connection tools remain denied regardless of attached repo or skills

#### Scenario: Mode catalog stays Ask and Agent
- **WHEN** the chat mode catalog is read
- **THEN** only `ask` and `agent` are supported modes
