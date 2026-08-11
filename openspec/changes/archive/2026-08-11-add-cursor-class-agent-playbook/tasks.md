## 1. Standing instructions

- [x] 1.1 Rewrite `agent/instructions.md` with dual-path identity (chat/MCP vs attached-repo coding), keep Ask/Agent notes, trim morning-brief detail to a skill pointer, keep web research + MCP etiquette
- [x] 1.2 Ensure standing prompt explicitly disclaims IDE features and points the model at `load_skill` for matching procedures

## 2. Attached-repo playbook

- [x] 2.1 Expand `agent/instructions/attached-repo.ts` with explore → edit → verify → summarize guidance, harness-first `/workspace` edits, GitHub MCP only for remote ops
- [x] 2.2 Add/extend unit tests asserting attached-repo dynamic instruction content includes coding-loop keywords and no IDE claims

## 3. Skills

- [x] 3.1 Add `agent/skills/coding-on-attached-repo/SKILL.md` with task-oriented description and detailed coding playbook
- [x] 3.2 Add `agent/skills/morning-brief/SKILL.md` with cross-app status procedure (enabled/authorized connections only)
- [x] 3.3 Add `agent/skills/open-pr-from-sandbox/SKILL.md` for branch/commit/push + GitHub MCP PR flow
- [x] 3.4 Add tests that the three skills exist with non-empty `description` frontmatter (filesystem or eve skill discovery)

## 4. Verify

- [x] 4.1 Confirm Ask/Agent catalog and Ask harness omit behavior still pass existing tests
- [x] 4.2 Run `pnpm run verify` and fix any failures from this change
