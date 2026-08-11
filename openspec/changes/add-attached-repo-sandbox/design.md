## Context

Brain already pins `microsandbox()`, gates harness tools to Agent mode, and has GitHub MCP OAuth. Chat “projects” are organization folders, not git remotes. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Attach one GitHub repo per chat (URL or `owner/repo` + optional ref)
- Clone into `/workspace` on sandbox `onSession` for Agent
- Reuse GitHub MCP token for private clones when possible
- Composer UX to set/clear attachment

**Non-Goals:**
- Host path mounts, multi-repo, Docker backend switch, Vercel Sandbox
- Full IDE indexing / Cursor-parity SCM UI
- Replacing GitHub MCP for PRs/issues

## Decisions

### Client context carries `repo`
Extend turn client context with optional `{ owner, name, ref? }` (or `repo: "owner/name@ref"`). Persist attachment in `localStorage` keyed by chat id when available, else session-level React state for ephemeral chats.

### Clone in `onSession`, not bootstrap
Template bootstrap cannot know the user’s repo. `onSession` reads messages/client context (or session attrs) and clones once. Marker file `/workspace/.brain-repo` records what was cloned to skip re-clone within the session.

### Auth for private repos
Prefer credential brokering / HTTPS clone with token from `getStoredAccessToken(githubProvider, principal)` when present; otherwise public HTTPS clone. Never write the token into sandbox files.

### Network policy
Allow `github.com` / `*.githubusercontent.com` for clone; keep microsandbox (no Vercel).

### UI
Small composer control near mode picker: “Repo” chip showing `owner/name` when set; dialog/popover to paste URL and optional branch.

## Risks / Trade-offs

- [microsandbox host limits — Apple Silicon / KVM] → Document; fail with clear error if sandbox unavailable.
- [Token missing for private repo] → Surface actionable “connect GitHub” guidance.
- [Large repos] → Shallow clone (`--depth 1`); optional ref.

## Migration Plan

No DB migration. Existing chats have no attachment. Legacy Plan/Debug storage already falls back to Agent.

## Open Questions

None for v1 — default branch when ref omitted.
