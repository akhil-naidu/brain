## Why

The composer Repo popover is too small to explain GitHub connect vs attach, URL-with-branch vs fields, and private-repo requirements. Users are confused.

## What Changes

- Replace the Repo popover with an **Attach repository** dialog
- Support paste of full GitHub URLs (including `/tree/branch`) **and** separate Owner / Repo / Branch fields (kept in sync)
- Show GitHub connection status with a clear path to **Tools** for private repos
- Keep the composer chip as the entry point (no separate repos page)

## Capabilities

### Modified Capabilities

- `attached-repo-sandbox`: attach UX becomes a dialog with dual input + GitHub status guidance

## Impact

- `components/chat/attached-repo-control.tsx`
- `lib/chat/attached-repo.ts` helpers for field sync
- Tests for parse/sync and dialog behavior
- No change to sandbox clone/cleanup model
