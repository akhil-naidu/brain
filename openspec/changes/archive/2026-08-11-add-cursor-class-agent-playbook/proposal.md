## Why

Brain already has Ask/Agent modes, harness tools, and attached-repo sandbox cloning, but Agent instructions still read as a generic work assistant. Coding turns do not follow a Cursor-class loop (explore → edit in `/workspace` → verify → summarize), and MCP connections are easy to overuse when a repo is attached. Brain is not an IDE — the gap is agent playbook quality, not editor surfaces.

## What Changes

- Rewrite standing Agent instructions so Brain behaves as a dual-path assistant: plain chat + MCP work apps by default; Cursor-class coding agent when a GitHub repo is attached.
- Expand attached-repo dynamic instructions with an explicit coding playbook (prefer harness under `/workspace`, GitHub MCP only for remote PR/issue ops, verify with tests/checks when reasonable, no IDE fantasies).
- Add a small set of load-on-demand skills under `agent/skills/` (e.g. coding-on-attached-repo, morning-brief, open-pr-from-sandbox) so long procedures stay out of every-turn context.
- Keep Ask vs Agent only — do **not** restore Plan/Debug or Build CTA.
- Non-goals: no host-folder mount, LSP, inline diffs, apply-patch UI, Design Mode, Plan/Debug modes, auth/persistence changes, or any Vercel infrastructure.

## Capabilities

### New Capabilities

- `agent-coding-playbook`: Standing Agent identity and dual-path rules (chat/MCP vs attached-repo coding loop), plus authored Brain skills the model loads on demand.

### Modified Capabilities

- `attached-repo-sandbox`: Strengthen “prefer local checkout” so attached-repo Agent turns MUST receive a fuller coding playbook in dynamic instructions (not only a one-liner about harness vs GitHub MCP).

## Impact

- `agent/instructions.md` — rewrite standing prompt
- `agent/instructions/attached-repo.ts` — richer coding playbook when repo attached
- `agent/skills/*` — new packaged or flat skills
- Tests asserting instruction/skill presence and attached-repo guidance content
- No UI composer mode catalog changes; no sandbox backend changes; no new Vercel deps
