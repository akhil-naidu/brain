## Why

Brain can talk to GitHub via MCP (issues/PRs/remote file reads) but cannot work inside a local clone the way Cursor Agent does. Users want to attach a repo so Agent mode can edit, run tests, and use harness tools under `/workspace`.

## What Changes

- Allow attaching a GitHub repo (`owner/repo` or URL, optional ref) to a chat session.
- Pass attached repo through turn client context.
- On sandbox session start (Agent), shallow-clone the repo into `/workspace` when attached (using existing GitHub OAuth token when available).
- Composer UI to attach/clear a repo; show the active attachment.
- Agent instructions: when a repo is attached, prefer harness tools in `/workspace`; use GitHub MCP for PRs/issues.
- Non-goals: no Vercel Sandbox, no host-folder mount, no multi-repo, no replacing GitHub MCP, no Plan/Debug modes.

## Capabilities

### New Capabilities

- `attached-repo-sandbox`: Attach a GitHub repo to chat and clone it into the Agent microsandbox workspace.

### Modified Capabilities

- (none)

## Impact

- `agent/sandbox.ts`, `lib/chat/turn-client-context.ts`, `agent/lib/client-context-model.ts`
- Composer / ephemeral chat UI for attach control
- GitHub token reuse via existing MCP OAuth store
- Tests for parse/attach context and sandbox setup helpers
