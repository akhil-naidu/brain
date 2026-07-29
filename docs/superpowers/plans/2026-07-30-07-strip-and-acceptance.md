# Plan 07 — Strip Leftovers + Acceptance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove any leftover template auth/storage/Connect residue, align docs/env examples, and prove the full spec acceptance checklist.

**Architecture:** Final hygiene pass after Plans 02–06. Update `AGENTS.md` / `.env.example` for UI-first workflow. Confirm no-vercel policy still holds.

**Tech Stack:** same as prior plans

## Global Constraints

- Spec acceptance: `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`
- `.cursor/rules/no-vercel-infra.mdc` must remain satisfied

---

### Task 1: Dependency and file hygiene

**Files:**
- Modify: `package.json` / lockfile if stray deps slipped in
- Delete if present: `lib/db/**`, `lib/auth*.ts`, `app/api/auth/**`, `app/auth/**`, `components/auth/**`, `drizzle.config.ts`, `.vercelignore` (only if added), template Connect connection files
- Modify: `AGENTS.md`, `.env.example`, optionally `README.md`

**Interfaces:**
- Produces: clean tree for Brain chat UI without dead auth/DB code

- [ ] **Step 1: Scan for forbidden packages and imports**

```bash
rg -n "better-auth|@neondatabase|@upstash|@vercel/connect|vercelOidc|AI_GATEWAY|drizzle" \
  package.json package-lock.json app components lib agent || true
```

Remove any hits that are not intentional documentation references.

- [ ] **Step 2: Update `AGENTS.md`**

Add a short “Chat UI” note:

- Run `npm run dev` (Next + withEve) for the Brain UI
- Agent terminal (`eve dev`) is optional for debugging only
- Template reference: `/Users/dev/github/tmp/eve-chat-template`
- Open anonymous user auth is local/trusted only

- [ ] **Step 3: Ensure `.env.example` still documents model + MCP client envs only** (no Neon/Upstash/Better Auth/Connect UIDs)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Strip template auth/storage leftovers and document UI-first workflow.

EOF
)"
```

---

### Task 2: Full acceptance run

**Files:** none (verification only); fix bugs found, then commit fixes separately

- [ ] **Step 1: Run acceptance checklist**

| # | Check | Pass? |
| --- | --- | --- |
| 1 | `npm run dev` serves Brain UI without auth prompts | |
| 2 | Send message → assistant streams in UI (no terminal) | |
| 3 | New chat clears conversation | |
| 4 | Refresh does not restore messages | |
| 5 | Connections menu lists ClickUp/Slack/Asana/Gmail; authorize can start from UI | |
| 6 | No Vercel account / Neon / Upstash / Connect required locally | |
| 7 | Branding shows Brain + straight-line mark + teal/navy | |
| 8 | `agent/agent.ts` still Command Code | |

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0 (or fix errors until 0).

- [ ] **Step 3: Mark design status complete**

In `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`, set status to implemented (or add “Implemented: Plan 07 acceptance passed on YYYY-MM-DD”).

- [ ] **Step 4: Final commit if docs/fixes changed**

```bash
git add docs AGENTS.md .env.example
git commit -m "$(cat <<'EOF'
Record Brain chat UI acceptance against the design spec.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. Every row in the acceptance table above is checked pass
2. Forbidden dependency scan is clean (no better-auth / neon / upstash / connect runtime deps)
3. `npm run typecheck` exits 0
4. Plans index README can be marked Plans 01–07 complete
5. Template mirror at `/Users/dev/github/tmp/eve-chat-template` still documented for future ports

**Done.** Brain UI v1 complete per spec.
