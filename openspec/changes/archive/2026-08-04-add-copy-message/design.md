## Context

See proposal.md — Why. Whole-thread copy already lives in `messagesToMarkdown` / header Copy.

## Goals / Non-Goals

**Goals:**
- One-click copy of a single message
- Shared serializer with thread export
- Hover affordance consistent with Edit

**Non-Goals:**
- Copying only a selected text range
- Changing whole-thread Copy behavior

## Decisions

1. **`messageToMarkdown(message)`** — export body without a role heading (plain content). Prefer text/tools summary via existing `messageBody`.
2. **UI** — Copy icon on hover for messages with non-empty export; Check icon briefly on success.
3. **Clipboard** — reuse `copyTextToClipboard`.

## Risks / Trade-offs

- [Streaming assistant still growing] → Allow copy of current content; fine for v1.
