## Context

Brain projects eve messages (`EveMessage` with text/reasoning/tool parts). Users want offline reuse without a backend export pipeline.

## Goals / Non-Goals

**Goals:**
- Lossless-enough text export for notes
- One-click clipboard copy from the chat chrome
- Unit-tested serializer

**Non-Goals:**
- `.md` file download
- Perfect fidelity for every tool payload / HITL form
- Server-side export API

## Decisions

1. **`lib/chat/export-markdown.ts`** — pure function over `EveMessage[]` (+ optional title).
2. **Include** text parts; optionally reasoning as a blockquote/details-style section; tools as `_Tool: name_` one-liners.
3. **UI** — header “Copy” button when `messages.length > 0`, wired via a small actions callback from `EphemeralAgentChat` (same pattern as dispose).
4. **`navigator.clipboard.writeText`** with user-visible error if denied.

## Risks / Trade-offs

- Tool outputs can be large — summarize names only in v1.
- Clipboard requires secure context / permission — show toast on failure.
