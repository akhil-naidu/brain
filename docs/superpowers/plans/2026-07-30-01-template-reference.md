# Plan 01 — Template Reference + Rules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure a durable local mirror of eve-chat-template and project rules so Brain UI work always has a refreshable reference.

**Architecture:** Keep the upstream template outside this git repo at `/Users/dev/github/tmp/eve-chat-template`. Document sync + high-value paths in a Cursor always-apply rule and in this plans index.

**Tech Stack:** git, Cursor rules (`.mdc`)

## Global Constraints

- Do not vendor the full template into the Brain git repo.
- Do not introduce Vercel infra dependencies while consulting the template.
- Spec: `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`

---

### Task 1: Verify or create the local clone

**Files:**
- External: `/Users/dev/github/tmp/eve-chat-template` (not committed to Brain)

**Interfaces:**
- Produces: readable tree at that path with `package.json`, `app/`, `components/chat/`

- [ ] **Step 1: Ensure directory and clone**

```bash
mkdir -p /Users/dev/github/tmp
if [ -d /Users/dev/github/tmp/eve-chat-template/.git ]; then
  git -C /Users/dev/github/tmp/eve-chat-template fetch origin
  git -C /Users/dev/github/tmp/eve-chat-template checkout main
  git -C /Users/dev/github/tmp/eve-chat-template pull --ff-only origin main
else
  git clone https://github.com/vercel-labs/eve-chat-template.git /Users/dev/github/tmp/eve-chat-template
fi
```

- [ ] **Step 2: Record HEAD for the plans README note**

```bash
git -C /Users/dev/github/tmp/eve-chat-template rev-parse --short HEAD
git -C /Users/dev/github/tmp/eve-chat-template log -1 --oneline
test -f /Users/dev/github/tmp/eve-chat-template/components/chat/composer.tsx
test -f /Users/dev/github/tmp/eve-chat-template/app/_components/agent-chat.tsx
```

Expected: short SHA prints; both `test` commands exit 0.

- [ ] **Step 3: Commit nothing for the clone** (external path). Proceed.

---

### Task 2: Cursor rule + plans index

**Files:**
- Create/verify: `.cursor/rules/eve-chat-template-reference.mdc`
- Create/verify: `docs/superpowers/plans/README.md`

**Interfaces:**
- Produces: always-apply rule pointing agents at the mirror path and sync commands

- [ ] **Step 1: Confirm rule exists and path is exact**

```bash
rg -n "github/tmp/eve-chat-template" .cursor/rules/eve-chat-template-reference.mdc
rg -n "2026-07-30-0" docs/superpowers/plans/README.md
```

Expected: both match.

- [ ] **Step 2: If missing, recreate from this session’s rule content** (path must be `/Users/dev/github/tmp/eve-chat-template`).

- [ ] **Step 3: Commit rule + plans index (and any plan files already written)**

```bash
git add .cursor/rules/eve-chat-template-reference.mdc docs/superpowers/plans/
git commit -m "$(cat <<'EOF'
Add eve-chat-template reference rule and ordered chat UI plans.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. `test -d /Users/dev/github/tmp/eve-chat-template/.git` exits 0
2. `test -f .cursor/rules/eve-chat-template-reference.mdc` exits 0
3. Rule contains the absolute path `/Users/dev/github/tmp/eve-chat-template`
4. `docs/superpowers/plans/README.md` lists plans 01–07 in order
5. Sync command from the rule successfully runs `git -C /Users/dev/github/tmp/eve-chat-template status`

**Stop here.** Do not start Plan 02 until this checklist passes.
