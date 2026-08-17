# agent-safety-posture Specification

## Purpose

Gives the Brain host a single organization-wide agent safety posture (Strict, Auto, Dangerous) and a command policy that still blocks high-risk shell and SQL even when HITL is skipped.

## Requirements

### Requirement: Instance agent safety posture catalog
The system MUST persist an instance agent safety posture of `strict`, `auto`, or `dangerous`. Missing or unknown stored values MUST resolve to `auto`. Default for a new host MUST be `auto`.

#### Scenario: Default posture is Auto
- **WHEN** a host has no agent safety posture stored
- **THEN** interactive Agent turns use Auto HITL rules

#### Scenario: Unknown posture falls back to Auto
- **WHEN** stored posture is not `strict`, `auto`, or `dangerous`
- **THEN** the system treats the posture as `auto`

### Requirement: Tool-call decision precedence
For each tool call the system MUST apply this order, first match wins: (1) Ask mode omit/deny, (2) Plan mode omit/deny of mutating tools, (3) command policy deny, (4) instance posture HITL (`strict` / `auto` / `dangerous`). Command policy MUST run even when posture is `dangerous`. Ask and Plan omit/deny MUST NOT be weakened by Dangerous.

#### Scenario: Dangerous cannot run Ask-mode tools
- **WHEN** posture is `dangerous` and the turn mode is Ask
- **THEN** connection tools remain denied and harness tools remain omitted

#### Scenario: Dangerous cannot restore Plan mutating tools
- **WHEN** posture is `dangerous` and the turn mode is Plan
- **THEN** mutating harness tools remain omitted and mutating connection tools remain denied

#### Scenario: Command policy beats Dangerous
- **WHEN** posture is `dangerous` and a tool call matches the command policy
- **THEN** the call is denied and does not execute

### Requirement: Strict posture requires approval for nearly every tool
When posture is `strict` and the turn is an interactive Agent or Debug turn, the system MUST require in-chat user approval before executing connection tools (including reviewed read/list/get tools) and before executing harness bash and write-file tools. Unknown tool names MUST require approval.

#### Scenario: Strict pauses a reviewed read
- **WHEN** posture is `strict` on an interactive Agent turn and the model calls a reviewed ClickUp read tool
- **THEN** the connection approval policy requires user approval

#### Scenario: Strict pauses bash
- **WHEN** posture is `strict` on an interactive Agent turn and the model calls harness bash with a command that the command policy allows
- **THEN** the call waits for in-chat user approval before executing

### Requirement: Auto posture keeps today’s HITL split
When posture is `auto` and the turn is interactive Agent or Debug, reviewed read/list/get connection tools MAY skip approval. Mutating connection tools and unknown tool names MUST require user approval. Harness bash and write-file MUST NOT require HITL solely because of posture (command policy still applies).

#### Scenario: Auto skips a reviewed read
- **WHEN** posture is `auto` on an interactive Agent turn and the model calls a reviewed ClickUp read tool
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: Auto pauses a write
- **WHEN** posture is `auto` on an interactive Agent turn and the model calls `clickup_create_task`
- **THEN** the connection approval policy requires user approval

### Requirement: Dangerous posture skips HITL except command policy
When posture is `dangerous` and the turn is an interactive Agent or Debug turn, tools that Auto would have paused MUST execute without an in-chat approval pause unless the command policy denies them. Ask and Plan constraints still apply.

#### Scenario: Dangerous skips write approval
- **WHEN** posture is `dangerous` on an interactive Agent turn and the model calls `clickup_create_task` with arguments that the command policy allows
- **THEN** the connection approval policy does not require user approval

### Requirement: Command policy denies high-risk shell
The command policy MUST deny harness bash (and equivalent shell) when the command matches a high-risk pattern, including: recursive `rm` (`-r` / `-R` / `--recursive`), `rm -rf` / `rm -fr`, `mkfs`, `dd` with `of=` targeting `/dev/`, and the classic `:(){ :|:& };:` fork bomb. Matching calls MUST be denied with a reason, MUST NOT execute, and MUST NOT become an approval prompt.

#### Scenario: Recursive delete is denied in Auto
- **WHEN** posture is `auto` and bash is called with `rm -rf /tmp/workspace`
- **THEN** the call is denied and the files are not deleted

#### Scenario: Recursive delete is denied in Dangerous
- **WHEN** posture is `dangerous` and bash is called with `rm -rf /tmp/workspace`
- **THEN** the call is denied and the files are not deleted

#### Scenario: Harmless listing is allowed
- **WHEN** bash is called with `ls -la /workspace`
- **THEN** the command policy does not deny the call

### Requirement: Command policy denies destructive SQL and matching MCP tools
The command policy MUST deny tool calls whose name or string arguments match destructive SQL or database-drop operations, including `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE TABLE`, `ALTER TABLE … DROP`, and Mongo MCP tools named `drop-database` or `drop-collection`. Matching calls MUST be denied in every posture, MUST NOT execute, and MUST NOT become an approval prompt.

#### Scenario: DROP TABLE via bash is denied
- **WHEN** bash is called with a command containing `DROP TABLE accounts`
- **THEN** the call is denied

#### Scenario: Snowflake SQL drop is denied
- **WHEN** a Snowflake (or Toolbox) tool is called with a statement containing `DROP TABLE`
- **THEN** the call is denied even if posture is `dangerous`

#### Scenario: Mongo drop-collection is denied
- **WHEN** the model calls a Mongo MCP tool named `drop-collection`
- **THEN** the call is denied even if posture is `dangerous`

### Requirement: Unattended runs keep Auto HITL and still apply command policy
Morning-brief and playbook schedule runs MUST use Auto HITL rules regardless of instance posture so they do not wait for a person who is not present. Command policy MUST still deny matching calls on those runs. Interactive chat turns MUST use the stored instance posture.

#### Scenario: Strict does not stall a scheduled read
- **WHEN** posture is `strict` and a scheduled morning brief calls a reviewed read connection tool
- **THEN** that scheduled call does not require in-chat user approval

#### Scenario: Scheduled destructive SQL is still denied
- **WHEN** a scheduled playbook calls a tool with `DROP TABLE`
- **THEN** the call is denied

### Requirement: Slack inbound is interactive not unattended
Inbound Slack Agent turns MUST use the stored instance agent safety posture for HITL, the same as browser chat. They MUST NOT use the unattended schedule exception (forced Auto HITL). Command policy MUST still deny matching calls. Auto and Strict MUST still screen tool results; Dangerous interactive Slack turns skip result screening the same as Dangerous browser turns.

#### Scenario: Strict Slack read waits
- **WHEN** posture is `strict` and a Slack Agent turn calls a reviewed read connection tool
- **THEN** the call requires user approval in Slack

#### Scenario: Dangerous Slack write skips HITL
- **WHEN** posture is `dangerous` and a Slack Agent turn calls a mutating connection tool the command policy allows
- **THEN** the call does not require HITL

#### Scenario: Scheduled runs remain distinct
- **WHEN** a morning-brief schedule runs while Slack inbound is also configured
- **THEN** the schedule still uses unattended Auto HITL and Slack inbound still uses instance posture
