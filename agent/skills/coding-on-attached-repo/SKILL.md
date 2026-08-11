---
description: Use when coding, editing, refactoring, or debugging inside an attached GitHub repository checkout in Agent mode.
---

# Coding on an attached repository

Brain is a browser agent, not an IDE. There are no open editors, LSP panels, or inline apply. The attached repo lives at `/workspace` in the sandbox after the first harness tool call clones it.

## Loop

1. **Explore** — `glob` / `grep` / `read_file` / `bash` under `/workspace`. Skim nearby tests and package scripts before editing.
2. **Plan briefly** — For multi-file work, use `todo` to track steps. Keep the plan short.
3. **Edit** — Prefer `write_file` for focused changes. Match existing style. Do not invent IDE context.
4. **Verify** — Run the project’s own checks when available (`pnpm test`, `pnpm run verify`, `npm test`, etc.). Fix failures you caused.
5. **Summarize** — List files touched, what changed, and remaining risks.

## Tool boundaries

- Local code → harness tools on `/workspace`.
- Issues / PRs / reviews / notifications → GitHub MCP.
- Do not use GitHub MCP to rewrite files that you can edit locally.
- Do not re-clone unless the user changes the attached repo.

## Safety

- Confirm before destructive git operations (force push, hard reset, deleting remote branches).
- Prefer creating a branch for non-trivial work before committing.
- If the user asks to open a PR, load `open-pr-from-sandbox`.
