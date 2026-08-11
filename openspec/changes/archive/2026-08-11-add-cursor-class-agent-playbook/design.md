## Context

See proposal.md for motivation. Today Brain has Ask/Agent gating, gated harness tools, and thin attached-repo dynamic instructions (`agent/instructions/attached-repo.ts`). Standing prompt (`agent/instructions.md`) is work-assistant oriented. eve already supports `agent/skills/` + `load_skill`; Brain has no authored skills yet. Plan/Debug were shipped then removed — this design must not revive them.

## Goals / Non-Goals

**Goals:**
- Dual-path standing instructions (chat/MCP vs attached-repo coding)
- Richer attached-repo dynamic playbook
- Three load-on-demand skills without bloating every turn
- Spec + tests that lock playbook content and skill presence

**Non-Goals:**
- Plan/Debug/Build UI or mode catalog changes
- Host mounts, LSP, diffs, apply UI, or other IDE chrome
- New tools, sandbox backends, auth, or Vercel infra
- Porting Cursor `.cursor/rules` wholesale into Brain

## Decisions

### 1. Standing prompt vs dynamic vs skills
- **Standing (`instructions.md`)**: short dual-path identity, tool discretion, MCP etiquette, web research — always on.
- **Dynamic (`instructions/attached-repo.ts`)**: coding loop only when repo attached + Agent mode (already gated).
- **Skills**: long procedures (morning brief steps, PR-from-sandbox checklist, detailed coding playbook) via `load_skill`.
- **Alternative considered**: put full coding playbook only in standing instructions → rejected (bloats non-coding turns).
- **Alternative considered**: no skills, only instructions → rejected (morning brief / PR procedures are situational).

### 2. Skill set (v1)
Ship three skills:
1. `coding-on-attached-repo` — detailed harness coding loop + when to use GitHub MCP
2. `morning-brief` — cross-app status procedure (moves detail out of standing prompt)
3. `open-pr-from-sandbox` — branch, commit, push, open PR via GitHub MCP after sandbox edits

Use packaged `SKILL.md` with `description` frontmatter for clear routing. Flat markdown only if a skill stays tiny.

### 3. Keep Ask/Agent only
Do not restore Plan/Debug. Spec explicitly locks the catalog to `ask` | `agent`. Users who want a plan can ask in Agent; Build CTA stays out.

### 4. Verification without IDE
“Verify” means sandbox commands the project already has (`pnpm test`, `pnpm run verify`, etc.) when discoverable — not claimed linter panels or unsaved editor buffers.

### 5. Tests
- Snapshot or substring asserts on attached-repo instruction markdown (coding loop keywords).
- Unit/build-level check that the three skills exist and advertise descriptions (eve skill discovery or filesystem + frontmatter parse).
- Existing Ask-mode harness omit tests remain green.

## Risks / Trade-offs

- [Model ignores playbook and uses GitHub MCP for file edits] → Mitigation: strong prefer-harness wording in both dynamic instructions and coding skill; no new hard gate required in v1.
- [Skills never loaded] → Mitigation: task-oriented `description` frontmatter; standing prompt mentions loading skills when the task matches.
- [Standing prompt grows again] → Mitigation: move situational detail into skills; keep instructions.md short in review.
- [Users expect Plan mode back] → Accept; document Ask/Agent-only in playbook purpose.

## Migration Plan

- Ship as agent prompt/skill files only; no DB or client preference migration.
- Legacy `plan`/`debug` localStorage values already map to `agent` — unchanged.
- Rollback: revert instruction/skill files; no schema rollback.
