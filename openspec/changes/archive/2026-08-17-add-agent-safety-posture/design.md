## Context

See proposal.md for motivation. Today MCP approval lives in `approvalForTool` (Ask deny, else read allowlist vs `user-approval`). Harness `bash` / `write_file` wrap eve defaults via `gateHarnessTool` and have no HITL and no command denylist. Instance policies already persist a singleton `brain_instance_policy` row and expose GET/PUT `/api/instance/policies` plus `/settings/instance`.

## Goals / Non-Goals

**Goals:**

- One host-wide posture knob on the existing instance policy row
- One pure matcher for command policy, shared by MCP approval and bash execute
- Default `auto` so existing hosts keep current HITL without a migration flag
- Keep Ask / Plan tool constraints stronger than Dangerous

**Non-Goals:**

- Classifier on tool *results* (QM Auto screening)
- Per-workspace posture or admin-edited regex lists
- Slack inbound channel, persistent VMs, second harness
- Changing Better Auth, chat persistence, or introducing Vercel services

## Decisions

### 1. Store posture on `brain_instance_policy`
- **Choice:** Column `agent_safety_posture TEXT NOT NULL DEFAULT 'auto'` with CHECK (`strict` | `auto` | `dangerous`). `ALTER TABLE … ADD COLUMN IF NOT EXISTS` plus bump `BRAIN_SCHEMA_REVISION`. Extend `InstancePolicies`, parse helper, PUT zod schema, instance settings select.
- **Why:** Same admin surface and tenancy as signup/workspace knobs. No new table, no env-only hidden switch.
- **Alternative:** Env var only — operators already manage this class of knob in the UI; env would drift from `/settings/instance`.

### 2. Resolve posture per tool decision, not per eve process
- **Choice:** Read policies from the workspace store inside the approval/bash path (with a short in-process TTL cache, e.g. a few seconds, so a Strict turn does not query Postgres on every tool in a burst). Interactive vs unattended: if the turn is a schedule runner, force Auto HITL *after* command policy.
- **Why:** Instance admin can change posture without restarting eve. Schedules cannot complete HITL.
- **Alternative:** Inject posture once at session start — cheaper, but a mid-session policy change would be invisible and schedules would inherit Strict and hang.

### 3. Command policy is code, not configuration
- **Choice:** `evaluateCommandPolicy({ toolName, args })` in `lib/agent/` (or `agent/lib/`) with a tested denylist: recursive `rm`; `mkfs`; `dd of=/dev/…`; fork bomb; SQL `DROP TABLE|DATABASE|SCHEMA`, `TRUNCATE TABLE`, `ALTER TABLE … DROP`; Mongo `drop-database` / `drop-collection`. Inspect bash `command` string and any string values in MCP args (JSON-serialized). Deny returns `{ type: "denied", reason }` and never `user-approval`.
- **Why:** Operators cannot accidentally empty the denylist; tests pin the patterns; v1 stays small.
- **Alternative:** Admin-editable patterns — easy to weaken the org baseline, which this change exists to prevent.

### 4. Wire MCP through `approvalForTool`; bash through execute wrap
- **Choice:** Extend `approvalForTool(..., { posture, unattended, args })`. Snowflake / HTTP MCP callbacks already funnel here. Wrap `bash` (and `write_file` only for Strict HITL / policy on path-less writes if needed) in `gateHarnessTool` so Auto/Dangerous bash still runs without HITL when policy allows, matching today’s Agent coding loop.
- **Why:** One matrix for all OAuth MCP tools. Bash is the high-risk shell surface; write-file is not recursive-delete. Strict still pauses write-file via the same wrap.
- **Alternative:** Eve-level global approval hook — not required if all Brain connections already pass `approvalForTool`.

### 5. Precedence is explicit in one helper
- **Choice:** `decideToolAuthorization({ mode, posture, unattended, toolKind, toolName, args })` implementing spec order: Ask → Plan mutating → command policy → posture HITL.
- **Why:** Avoid forked copies in bash vs MCP that drift.
- **Alternative:** Separate bash and MCP policies — faster to ship, guaranteed inconsistency.

### 6. Docs, not chat chrome
- **Choice:** Document on instance-policies, approvals, and security pages. No composer badge in this change.
- **Why:** Members can already GET policies; a badge is UX polish, not the control plane.
- **Alternative:** Always-visible posture chip — useful later, not needed to make the knob real.

## Risks / Trade-offs

- **[False positives]** Aggressive SQL regex may deny legitimate `drop` in prose inside a ticket body → Mitigation: match SQL-like statements (word-boundary keywords, not the substring `backdrop`). Tests for negatives (`ls`, `SELECT`, `clickup_create_task` with normal args).
- **[False negatives]** `rm $FLAGS` / encoded SQL / nested `sh -c` can bypass → Mitigation: still deny common concatenated forms (`sh -c 'rm -rf …'`); document that the list is a baseline not a sandbox substitute; microsandbox remains the isolation boundary.
- **[Dangerous is dangerous]** Skipping HITL can send Slack or mutate boards → Mitigation: default stays Auto; UI copy states the risk; command policy still blocks destructive SQL/shell.
- **[Stale cache]** TTL cache could serve old Auto after admin switches to Strict → Mitigation: small TTL; PUT policies invalidates the cache in-process when possible.
- **[eve HITL for bash]** If default bash tools ignore `approval` on `defineTool`, Strict bash must use eve’s approval field or a pre-execute wait equivalent → Mitigation: spike in task 2; if eve cannot HITL harness tools, fail closed in Strict (deny bash/write until a supported HITL path exists) rather than silently Auto-executing.

## Migration Plan

1. Deploy schema ALTER with default `auto` — existing hosts unchanged in behavior.
2. No data backfill. Rollback: revert app; leftover column is unused and safe.

## Open Questions

_(none — classifier, Slack inbound, and persistent VMs are deferred products, not blockers for this design.)_
