## Why

Brain already pauses mutating MCP tools and offers Ask vs Agent, but the host has no organization-wide safety posture and no command policy that can still block `rm -rf` or `DROP TABLE` when a human is not in the loop. Operators who self-host need a QM-style Strict / Auto / Dangerous baseline they can set once, without introducing a second agent runtime or Vercel infrastructure.

## What Changes

- Add an instance policy `agentSafetyPosture`: `strict` | `auto` | `dangerous` (default `auto`, matching today’s HITL split).
- Instance admins set it on `/settings/instance`. Members can read the current value; they cannot change it.
- Apply posture to **interactive Agent (and Plan/Debug) turns**:
  - **Strict** — almost every tool call waits for in-chat approval (including reads and harness bash/write).
  - **Auto** — today’s behavior: allowlisted reads skip approval; writes and unknown tools wait.
  - **Dangerous** — skip HITL pauses for tools that Auto would have paused.
- Enforce a **command policy** in every posture, including Dangerous: deny high-risk shell and destructive SQL (and matching MCP tool names/args). Denied calls never execute; they do not become an approval prompt.
- Ask mode still denies all connection tools and omits harness tools, regardless of posture.
- Unattended runs (morning brief / playbook schedules) keep Auto HITL rules so they do not hang waiting for a person; command policy still applies.
- Document posture and command policy in customer docs (instance policies, approvals, security).

Non-goals for this change:

- Slack as an inbound agent channel
- Persistent sandbox VMs / attached disks
- Vendoring QM, PI, or Claude Code as a second harness
- Prompt-injection classifier on tool results (QM “Auto” screening)
- Admin-editable denylist or per-workspace loosening
- Workspace-level posture (tighten-only overrides)
- Auth, chat persistence, or Vercel infra changes

## Capabilities

### New Capabilities

- `agent-safety-posture`: Instance-wide Strict / Auto / Dangerous HITL posture plus a host command policy that denies high-risk shell and SQL even in Dangerous.

### Modified Capabilities

- `instance-policies`: Persist and admin-update `agentSafetyPosture`; non-admins cannot change it.
- `mcp-connections`: Connection tool approval MUST apply posture and MUST deny command-policy matches instead of executing or prompting.
- `chat-agent-modes`: Ask remains a hard deny/omit; Agent/Plan/Debug HITL is modulated by posture; command policy still applies.
- `customer-docs`: Document the posture control and command-policy baseline.

## Impact

- `brain_instance_policy` schema + `InstancePolicies` / parse / GET+PUT `/api/instance/policies`
- Instance settings UI
- `approvalForTool` and HTTP MCP / Snowflake approval callbacks
- Harness bash (and write) gating via `gateHarnessTool` / execute wrapper
- Pure command-policy matcher (unit-tested denylist)
- Customer docs: instance policies, approvals, security
- Tests for policy persist, approval matrix, and deny patterns
- `pnpm run verify` (and `openspec:validate`)
