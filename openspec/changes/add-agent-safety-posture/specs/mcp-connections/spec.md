## ADDED Requirements

### Requirement: Connection approval respects instance safety posture
For interactive Agent and Debug turns, MCP connection approval MUST apply the instance agent safety posture after Ask/Plan constraints and command policy: Strict requires user approval for connection tools including reviewed reads; Auto keeps reviewed reads as not requiring approval and writes/unknown as user approval; Dangerous skips user approval for tools Auto would pause unless command policy denied the call.

#### Scenario: Strict requires approval for a reviewed read
- **WHEN** posture is `strict` on an interactive Agent turn and the model calls a reviewed ClickUp read tool
- **THEN** the connection approval policy requires user approval

#### Scenario: Dangerous skips approval for a ClickUp write
- **WHEN** posture is `dangerous` on an interactive Agent turn and the model calls `clickup_create_task` with arguments the command policy allows
- **THEN** the connection approval policy does not require user approval

### Requirement: Command policy denies destructive connection calls
MCP connection tools MUST be denied (not executed, not prompted) when the tool name or string arguments match the host command policy (destructive SQL or database-drop tools). This MUST apply in every posture, including Dangerous.

#### Scenario: Destructive SQL argument is denied
- **WHEN** a Snowflake or Toolbox tool is invoked with a statement containing `DROP TABLE`
- **THEN** the connection approval policy denies the call

## MODIFIED Requirements

### Requirement: Task and issue write tools require user approval
When instance agent safety posture is `auto` (the default), MCP connections that create or mutate work items (tasks, issues, comments that change work, status updates, assignees) MUST require in-chat user approval before execution. Only explicitly reviewed read/list/get tools MAY skip approval (`not-applicable`). Unknown tool names MUST require approval (fail closed). Brain MUST NOT auto-approve create/update/delete task tools by default; remembered “always allow” is out of scope until separately specified. Strict and Dangerous MUST follow the agent-safety-posture capability instead of this Auto baseline. Command policy denials MUST take precedence over this requirement.

#### Scenario: ClickUp task writes require approval
- **WHEN** the model calls `clickup_create_task` or `clickup_update_task` and posture is `auto`
- **THEN** the connection approval policy requires user approval

#### Scenario: ClickUp task reads skip approval
- **WHEN** the model calls a reviewed ClickUp read tool such as `clickup_get_task` or `clickup_filter_tasks` and posture is `auto`
- **THEN** the connection approval policy treats that tool as not requiring user approval

#### Scenario: Linear issue writes require approval
- **WHEN** the model calls `save_issue` (or another Linear write tool not on the reviewed read-only list) and posture is `auto`
- **THEN** the connection approval policy requires user approval

#### Scenario: Asana task writes require approval
- **WHEN** the model calls an Asana create/update task tool that is not on the reviewed read-only list and posture is `auto`
- **THEN** the connection approval policy requires user approval
