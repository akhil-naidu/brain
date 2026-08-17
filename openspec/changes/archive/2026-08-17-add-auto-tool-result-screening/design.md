## Context

See proposal.md for motivation. HITL and command policy already run *before* execute (`decideToolAuthorization`). Eve hooks are observe-only and cannot change what the model sees. MCP tool `execute` lives inside eve’s `connection_search` wrapper, so Brain cannot wrap that function the way it wraps `gateHarnessTool`. Harness tools (`bash`, `write_file`, `read_file`, `web_fetch`, `grep`, `glob`) already go through `gateHarnessTool`. Every turn model is created in `agent/lib/resolve-chat-model.ts` (Command Code or custom OpenAI-compatible — never Vercel AI Gateway).

## Goals / Non-Goals

**Goals:**

- One pure matcher for tool *output*, shared by harness execute wraps and a model-input wrap
- Screen Auto, Strict, and all unattended runs; skip only interactive Dangerous
- Fail closed: matcher errors or oversized payloads still do not deliver raw untrusted text to the model without a bound scan
- Default host stays Auto: existing installs gain screening without a new policy column

**Non-Goals:**

- Second model call / hosted classifier
- Editing eve internals or vendoring QM
- Redacting secrets from the operator’s Postgres chat log if the stream already stored raw MCP output (model protection is the requirement; execute wrap is the preferred way to keep the UI in sync)
- Admin UI for the pattern list

## Decisions

### 1. Heuristic matcher in Brain code
- **Choice:** `evaluateToolResultScreening(payload: unknown): "pass" | "deny"` stringifies JSON/text, caps at a fixed byte length (e.g. 256 KiB) for the scan, and matches tested regexes for ignore-previous-instructions / new-system-prompt / role-override phrases, plus PEM private keys, `AKIA` AWS key ids, `ghp_` / `github_pat_`, `xox[baprs]-` Slack tokens.
- **Why:** Same shape as `evaluateCommandPolicy`; no extra latency or vendor; unit tests pin false-positive cases (`Follow up with prior instructions from legal`).
- **Alternative:** Extra LLM classify call — cost, injection surface on the classifier prompt, needs a model key on every tool, not self-host-simple.

### 2. When screening runs
- **Choice:** Run when stored posture is `auto` or `strict`, **or** the turn is unattended (schedules already force Auto HITL). Skip only when posture is `dangerous` **and** the turn is interactive.
- **Why:** Mirrors unattended HITL. A Dangerous host must not leave morning briefs unprotected.
- **Alternative:** Screen Auto only — Strict would feed approved-call results into the model unsanitized.

### 3. Harness: wrap execute in `gateHarnessTool`
- **Choice:** After `defaultTool.execute`, if screening applies, replace the return value with a short stub string (same reason text the model should see). Pass `kind` only where HITL already needs it; screening applies even when `kind` is omitted (`read_file`, `web_fetch`).
- **Why:** `action.result` then matches the model, so the chat card does not show the injection while the model sees a stub.
- **Alternative:** Screen only at the model — UI still renders the attack text.

### 4. MCP: wrap the LanguageModel, not eve’s client
- **Choice:** `wrapLanguageModel` (AI SDK) around every model returned from `createCommandCodeFallbackModel` / `resolveChatModelSelection`. Middleware walks `prompt` tool-result parts (and equivalent message content) and replaces matching output before `doGenerate` / `doStream`. Use the same matcher. Never introduce AI Gateway.
- **Why:** Eve builds MCP tools internally; Brain cannot intercept `executeTool` without forking eve. The next model step is the last choke point that still satisfies “the model MUST NOT receive that payload.”
- **Alternative:** Patch eve — out of scope. Observe-only `defineHook` — too late.

### 5. Stub, not HITL
- **Choice:** Deny-style stub: tool already ran; output blocked by Auto screening. No `user-approval`.
- **Why:** Showing the payload in an approve card would leak it to the human and the next model step if they approve. Too late to undo a read.

### 6. Docs only for chrome
- **Choice:** Update instance-policies, approvals, security, glossary. No composer badge.
- **Why:** Same as the posture change; members can already read instance policies.

## Risks / Trade-offs

- **[False positives]** Task text with “ignore” near “instructions” → Mitigation: require the ignore-previous/prior-instructions *phrase* (and similar), not isolated words; tests for negatives.
- **[False negatives]** Encoded/obfuscated injection, HTML comments, base64 → Mitigation: document as a baseline, not a sandbox; Dangerous remains the opt-out; command policy still covers destructive *calls*.
- **[MCP UI vs model]** Model wrap redacts the next generate; the stream may already have raw MCP output → Mitigation: still fail closed for the model; note in security docs; prefer execute wrap wherever Brain owns `execute`.
- **[Latency]** Regex on 256 KiB is cheap vs a second model; cap avoids ReDoS on huge Snowflake dumps → Mitigation: cap + non-catastrophic quantifiers in tests.
- **[Custom models]** Wrap must apply to Foundry/custom OpenAI-compatible models too, not only Command Code → Mitigation: wrap in `resolveChatModelSelection` return path.

## Migration Plan

1. Deploy matcher + wraps. No schema change. Auto hosts start screening immediately.
2. Rollback: revert app; no leftover columns.

## Open Questions

_(none — Slack inbound, durable VMs, and an LLM classifier remain deferred products.)_
