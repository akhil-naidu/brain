## Why

Instance Auto posture today only means “reads skip HITL, writes wait.” A ticket, email, or shell output can still tell the model to ignore instructions after the tool has already run. Operators who just got Strict / Auto / Dangerous need Auto to screen tool *results*, not only tool *calls*, without a second harness or Vercel infrastructure.

## What Changes

- After a tool executes, **Auto and Strict** MUST screen the result before the model sees it. **Unattended** scheduled runs MUST screen even if the instance is Dangerous. **Interactive Dangerous** MUST skip this screening. Command policy and Ask/Plan constraints stay as they are.
- Screening is a **tested heuristic** in Brain code (prompt-injection phrases and common secret patterns). A match MUST replace the payload with a short stub. It MUST NOT become an approval prompt. The tool may already have run; screening cannot undo a ClickUp read.
- Cover harness tools (bash / write_file / other gated execute paths) and MCP connection tools. Prefer wrapping execute so the chat transcript matches what the model sees; if eve cannot wrap MCP execute, redact on the next model request and still fail closed for the model.
- Document on instance-policies, approvals, security, and glossary: Auto includes result screening; Dangerous skips it; command policy still always applies.

Non-goals:

- A second LLM / classifier service (QM-style model-on-every-result)
- Slack as an inbound agent channel
- Persistent sandbox VMs or a second harness (Pi, Claude Code, QM)
- Admin-editable regex lists or per-workspace loosening
- Changing Better Auth, chat persistence, or introducing Vercel services

## Capabilities

### New Capabilities

- `auto-tool-result-screening`: After tool execution, Auto and Strict screen results for injection and secret-like leakage before the model consumes them; Dangerous skips screening; matches become a stub, never HITL.

### Modified Capabilities

- `mcp-connections`: Connection tool outputs MUST pass the same screening before the model sees them when posture requires it.
- `chat-agent-modes`: Ask still omits/denies tools (nothing to screen). Agent/Debug turns MUST apply screening per posture. Plan reads that still execute MUST be screened.
- `customer-docs`: Document that Auto screens tool results, Dangerous does not, and blocked output never becomes an approve prompt.

## Impact

- New pure matcher (e.g. `agent/lib/screen-tool-result.ts`) plus unit tests
- Wrap harness `execute` (extend `gateHarnessTool` / remaining read tools as needed)
- MCP: execute wrap if possible, else Command Code `wrapLanguageModel` (or equivalent) so the next generate does not receive blocked payloads — never Vercel AI Gateway
- Customer docs: instance policies, approvals, security, glossary
- `pnpm run verify` and `openspec:validate`
- No schema / instance-policy column change; reuse existing `agentSafetyPosture`
