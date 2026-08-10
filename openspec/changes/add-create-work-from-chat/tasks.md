## 1. Export / download helpers

- [x] 1.1 Add filename sanitizer + `downloadTextFile` (or equivalent) beside existing clipboard helpers in `lib/chat/export-markdown.ts`
- [x] 1.2 Unit-test filename fallbacks and that download uses the same Markdown body as copy serializers
- [x] 1.3 Add `buildCreateClickUpDocPrompt({ title?, markdown, scope })` pure helper with unit tests for message vs thread scope

## 2. Message More menu

- [x] 2.1 Add Download as Markdown to the assistant More menu; wire to message Markdown + download helper
- [x] 2.2 Add Create ClickUp Doc to the assistant More menu; gate on ClickUp availability; enable connection when needed; `send()` the create-doc prompt
- [x] 2.3 Extend message / More-menu tests for the new items (available vs gated)

## 3. Chat chrome (thread scope)

- [x] 3.1 Add Download chat control next to Copy chat in the shell header; reuse thread Markdown serialization
- [x] 3.2 Add Create ClickUp Doc for the full thread (header control or overflow); same connection gate + prompt helper with `scope: "thread"`
- [x] 3.3 Wire handlers through chat workspace / nav context the same way as `onCopyChat`

## 4. Optional composer shortcut

- [x] 4.1 (Optional) Add a `/` composer command that seeds or sends the create-doc prompt; skip if More + header already cover acceptance

## 5. Verify

- [x] 5.1 Run `pnpm run verify` clean
- [x] 5.2 Manually smoke: download message + chat `.md`; Create ClickUp Doc with ClickUp connected; gated path when disconnected
