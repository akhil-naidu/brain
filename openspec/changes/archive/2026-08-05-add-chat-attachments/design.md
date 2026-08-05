## Context

eve already accepts AI SDK `UserContent` file parts as base64 data URLs. Brain’s composer was text-only.

## Decisions

1. **Client-side data URLs** — convert selected files in the browser; no upload API.
2. **Allowed types** — images, PDF, plain/markdown/csv text.
3. **Limits** — 5 files, 5 MB each.
4. **Paste** — clipboard images become attachments; long text paste stays in the textarea.

## Non-goals

- Cloud object storage
- Video/audio
- Persisting raw attachment bytes in SQLite beyond what eve’s stream events already store
