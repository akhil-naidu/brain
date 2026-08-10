## Why

Good Brain replies often die in the chat scroll: users already copy Markdown into notes or ask the agent to “put this in ClickUp,” but there is no first-class path from a settled reply (or the whole thread) into a durable document. Now that copy/export helpers and ClickUp MCP (including docs tools) exist, we should turn that into explicit UI actions.

## What Changes

- Add **Download as Markdown** for a single exportable message and for the whole chat (file download of the existing Markdown serializers).
- Add **Create ClickUp Doc** on settled assistant replies (and optionally the whole chat) that asks the agent to create a ClickUp document from the selected Markdown via the user’s authorized ClickUp connection.
- Surface both actions in the assistant message More menu; add a chat-level download control next to the existing Copy chat control.
- Optionally expose a composer `/` command that seeds the same create-doc intent (thin shortcut, not a parallel system).
- Non-goals: Notion Connect / Vercel Connect; Brain-hosted artifact canvas; PDF export; Slack canvas; public share links; perfect tool/HITL fidelity in the Markdown file; server-side export API.

## Capabilities

### New Capabilities

- `download-chat-markdown`: Download a message or the full conversation as a `.md` file from the browser.
- `create-clickup-doc-from-chat`: Create a ClickUp Doc from a chat reply or thread via the user’s ClickUp MCP connection, with clear success/failure feedback and a link when available.

### Modified Capabilities

- `assistant-message-more-menu`: Extend the More menu with Download as Markdown and Create ClickUp Doc when the message has exportable content.
- `copy-chat-markdown`: Add a companion Download chat as Markdown control beside Copy chat (clipboard behavior unchanged).

## Impact

- UI: `components/chat/message.tsx` (More menu), chat shell header / copy-chat control, possibly composer command items.
- Helpers: `lib/chat/export-markdown.ts` (filename + download trigger); small create-doc prompt / send helper.
- Agent/runtime: relies on existing ClickUp MCP OAuth + `clickup_create_document` (and related) tools — no new Vercel infra, no Notion Connect.
- Tests: unit tests for download helper / filename; component or integration coverage for menu actions when ClickUp is/isn't available.
- Specs: new `download-chat-markdown` and `create-clickup-doc-from-chat`; deltas for `assistant-message-more-menu` and `copy-chat-markdown`.
