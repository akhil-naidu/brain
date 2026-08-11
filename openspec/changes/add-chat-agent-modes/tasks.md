## 1. Mode core

- [x] 1.1 Expand `BrainChatMode` to `ask | agent | plan | debug` with resolve helpers
- [x] 1.2 Update turn client context for Plan/Debug connection guidance
- [x] 1.3 Add `extractChatMode` helpers (`isAskModeTurn`, `isPlanModeTurn`, `isDebugModeTurn`, omit policies)

## 2. Agent instructions and tool gates

- [x] 2.1 Add Plan and Debug dynamic instruction modules
- [x] 2.2 Split harness gating: omit all in Ask; omit mutating (write_file, bash) in Plan
- [x] 2.3 Wire instruction modules so eve loads them (same pattern as ask-mode)

## 3. Mode UI accents

- [x] 3.1 Add CSS mode accent tokens in `globals.css`
- [x] 3.2 Color `ChatModePicker` trigger by mode; list Plan/Debug options
- [x] 3.3 Pass mode into `ChatComposer` and tint border + send button

## 4. Tests and verify

- [x] 4.1 Update/add unit tests for mode resolve, turn context, and gating helpers
- [x] 4.2 Add/adjust component coverage for mode accents or picker options
- [x] 4.3 Run `pnpm run verify` and fix failures
