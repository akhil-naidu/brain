## Context

See proposal.md — Why. Brain already serializes messages via `lib/chat/export-markdown.ts` and exposes Copy (message + chat) plus an assistant More menu. ClickUp is a first-party MCP OAuth connection; document create/update tools are available to the agent when ClickUp is authorized and enabled. There is no dedicated server export API and no Notion/Vercel Connect path.

## Goals / Non-Goals

**Goals:**
- Client-side `.md` download reusing the existing serializers
- First-class Create ClickUp Doc actions that start a normal agent turn with structured content
- Clear gating when ClickUp is missing
- Keep create-doc and download discoverable in the More menu / chat chrome

**Non-Goals:**
- Direct browser → ClickUp REST calls bypassing the agent
- Brain-hosted artifact/canvas editor
- Notion, Slack canvas, or PDF in v1
- Server-side export endpoints or blob storage for downloads
- Changing Markdown fidelity for tools/HITL beyond today’s copy behavior

## Decisions

1. **Download = blob + object URL in the browser**  
   Add `downloadTextFile(filename, text)` next to `copyTextToClipboard` in `lib/chat/export-markdown.ts` (or a tiny sibling helper). Build filenames from chat title with a sanitize + `.md` suffix; fallback `brain-chat.md` / `brain-message.md`.  
   **Alternative considered:** server route that streams the file — rejected; adds auth/API surface for no benefit over client download.

2. **Create ClickUp Doc = agent-mediated turn, not a side API**  
   On action, enable ClickUp for the chat if needed, then `send()` a user message built from a fixed prompt template plus the selected Markdown body (message or full thread). The agent uses ClickUp MCP tools (`clickup_create_document` / page tools as available) and reports the link in-thread.  
   **Alternative considered:** Next.js route that calls ClickUp with the stored OAuth token — rejected for v1; duplicates MCP auth, tool schemas, and HITL/error UX the agent already owns.

3. **Connection gate in the UI**  
   Offer Create ClickUp Doc when ClickUp can be enabled for the session (connected or connectable). If not connected, selecting the action opens the existing connect/enable path (same spirit as composer `@ClickUp`) rather than sending a doomed turn. Do not show a fake “Created” toast.

4. **UI placement**  
   - Message: More menu items — Download as Markdown, Create ClickUp Doc (after Copy as Markdown).  
   - Thread: Download icon/control next to Copy chat in the shell header; Create ClickUp Doc for the thread via the same header overflow or a sibling control if space allows (prefer one overflow to avoid chrome clutter).  
   - Composer `/` command (optional thin shortcut): insert/run the same create-doc prompt template; not required for acceptance if More + header cover both scopes.

5. **Prompt template**  
   Keep a pure helper (e.g. `buildCreateClickUpDocPrompt({ title?, markdown, scope })`) so tests assert the instruction contract without mounting the full chat. Instruct the agent to create a Doc (not a task), use the provided Markdown as the body, pick a sensible title, and return the URL.

6. **No new MCP allowlist change required for create**  
   Create tools are write tools and already go through normal MCP execution when ClickUp is connected. `safeReadOnlyTools` stays read-only; do not add create tools there.

## Risks / Trade-offs

- **[Agent may create the wrong artifact type or location]** → Prompt is explicit (“ClickUp Doc”, not task); user can refine in a follow-up turn.  
- **[Large threads blow the prompt]** → Use the same text export as copy; if needed later, truncate with a clear note — out of scope unless we hit limits in practice.  
- **[ClickUp tool names / schema drift]** → Agent-mediated path absorbs MCP schema changes; UI only depends on connection availability + send.  
- **[Download blocked by browser settings]** → Same class of failure as clipboard; brief error feedback if the download helper cannot start.  
- **[Users expect instant doc without a chat turn]** → Trade-off accepted for v1; link and errors stay visible in-thread.

## Migration Plan

- Purely additive UI + helpers; no schema/migration.  
- Roll forward by shipping; roll back by hiding the menu/header actions.  
- No data backfill.

## Open Questions

- Exact ClickUp parent (workspace/space/folder) when the MCP create tool requires one — defer to agent tool defaults / follow-up user message if the first create needs clarification.
