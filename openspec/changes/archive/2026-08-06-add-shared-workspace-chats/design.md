## Context

Chats are keyed `workspace_id + user_id`. Spec currently requires other members’ chats to stay hidden. Product now wants optional shared threads in team workspaces.

## Decisions

1. **Visibility column** `personal | shared` on `chat` (default `personal`). Existing rows migrate as personal.
2. **Access**
   - List: own personal chats in active workspace **plus** all `shared` chats in that workspace
   - Get/update (title, events, eve session): owner **or** any workspace member if shared
   - Create shared: team workspace members only; personal workspace rejects `shared`
3. **Delete**
   - Personal: owner only
   - Shared: creator, or workspace owner/admin
4. **Agent turns** continue to run as the **current signed-in user** (MCP grants stay personal). Shared chat stores one `eve_session` cursor for the thread; concurrent multi-writer races are accepted for v1 (last write wins on session/events).
5. **UI**: “New shared chat” for team workspaces; list rows show a Shared affordance. Default New chat remains personal.

## Risks

- Concurrent editors on one eve session may interleave — document; no locking in v1
- Sharing a chat exposes prior tool outputs in that thread to all members
