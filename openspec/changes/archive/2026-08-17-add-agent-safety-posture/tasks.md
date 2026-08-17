## 1. Policy persistence and settings UI

- [x] 1.1 Add `agent_safety_posture` to `brain_instance_policy` (CREATE + `ALTER … ADD COLUMN IF NOT EXISTS` default `auto`) and bump `BRAIN_SCHEMA_REVISION`
- [x] 1.2 Extend `InstancePolicies`, parse helper, workspace store get/update, and PUT `/api/instance/policies` zod schema (`strict` | `auto` | `dangerous`)
- [x] 1.3 Instance settings: admin select for posture with risk copy for Dangerous; non-admins still receive posture on GET
- [x] 1.4 Tests: default `auto`, admin update, non-admin 403, unknown value resolves to `auto`

## 2. Command policy and authorization helper

- [x] 2.1 Implement `evaluateCommandPolicy` denylist (recursive `rm`, `mkfs`, `dd of=/dev/`, fork bomb, destructive SQL, Mongo drop tools) with negative cases (`ls`, `SELECT`, normal ClickUp args)
- [x] 2.2 Implement `decideToolAuthorization` precedence: Ask → Plan mutating → command policy → posture HITL; unattended forces Auto HITL after policy
- [x] 2.3 Spike eve harness-tool HITL (`approval` on `defineTool` / bash). If unsupported, Strict MUST fail closed (deny bash/write) instead of silent execute
- [x] 2.4 Unit tests for the authorization matrix (Ask+Dangerous, Plan+Dangerous, Strict read, Auto write, Dangerous write, policy deny)

## 3. Wire MCP and harness tools

- [x] 3.1 Route `approvalForTool` (and Snowflake / HTTP MCP callbacks) through `decideToolAuthorization`, including tool args for policy
- [x] 3.2 Wrap harness bash (and write-file for Strict HITL) so command policy denies before execute; Auto/Dangerous bash still skip HITL when allowed
- [x] 3.3 Mark scheduled morning-brief / playbook runs as unattended so they keep Auto HITL and still hit command policy
- [x] 3.4 Update existing approval tests; add bash deny tests (`rm -rf`, `DROP TABLE`)

## 4. Customer docs

- [x] 4.1 Document posture on instance-policies, approvals, and security pages (who can change it, Auto default, Ask/Plan still win, policy never becomes an approve prompt)

## 5. Verify

- [x] 5.1 `pnpm run openspec:validate` and `pnpm run verify`
