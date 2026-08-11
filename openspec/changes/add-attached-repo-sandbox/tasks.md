## 1. Repo identity helpers

- [x] 1.1 Add `lib/chat/attached-repo.ts` to parse `owner/repo` / GitHub URLs and optional ref
- [x] 1.2 Extend turn client context + extract helpers for attached repo
- [x] 1.3 Unit tests for parse/resolve and client context

## 2. Sandbox clone

- [x] 2.1 Expand `agent/sandbox.ts` with `onSession` network policy (clone on first harness use)
- [x] 2.2 Reuse GitHub OAuth token for HTTPS clone when available; public clone otherwise
- [x] 2.3 Add Agent instructions when a repo is attached

## 3. Composer UX

- [x] 3.1 Repo attach control (set/clear) in composer footer
- [x] 3.2 Wire state through ephemeral chat into turn client context
- [x] 3.3 Persist attachment per chat id when possible

## 4. Verify

- [x] 4.1 Tests for UI/helpers
- [x] 4.2 `pnpm run verify`
