---
description: Use when opening a pull request from sandbox edits on an attached GitHub repository (branch, commit, push, create PR).
---

# Open a PR from the sandbox

Use after coding on an attached repo at `/workspace`. Brain is not an IDE — ship via git in the sandbox plus GitHub MCP for the remote PR.

## Preconditions

- A repository is attached and cloned under `/workspace`.
- GitHub connection is authorized when the repo is private or push/PR creation requires it.
- Confirm the target base branch with the user if unclear.

## Procedure

1. In `/workspace`, check `git status` and `git diff`. Ensure changes are intentional.
2. Create a descriptive branch if not already on one (avoid committing directly to the default branch unless the user asks).
3. Stage and commit with a clear message focused on why.
4. Push the branch to origin (`git push -u origin HEAD` or equivalent).
5. Create the pull request with GitHub MCP (title, body summarizing what/why, link to key files). Do not use MCP to rewrite local files.
6. Return the PR URL and a short summary of commits included.

## Safety

- Never force-push to shared default branches.
- Never skip hooks unless the user explicitly asks.
- If push or PR creation fails for auth, surface the authorization challenge and stop inventing a PR URL.
