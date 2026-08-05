## 1. Store layer

- [x] 1.1 Add `ChatStore` types/interface (chat summary, full chat with session + events)
- [x] 1.2 Implement SQLite store with `node:sqlite` (`chat` + `chat_event`), migrate/create on open
- [x] 1.3 Resolve DB path from env (default under `.eve/`), ensure directory exists; gitignore DB file
- [x] 1.4 Unit tests for create/list/get/append/updateSession/delete

## 2. HTTP API

- [x] 2.1 `GET`/`POST` `/api/chats` — list summaries, create chat
- [x] 2.2 `GET`/`PATCH`/`DELETE` `/api/chats/[id]` — fetch full chat, update title/session/append events, delete
- [x] 2.3 Document `BRAIN_CHATS_DB_PATH` (or equivalent) in `.env.example`

## 3. Client wiring

- [x] 3.1 Client helper to call chat APIs
- [x] 3.2 Extend agent chat to accept `chatId`, `initialSession`, `initialEvents`; persist on event/session/finish; create chat on first send
- [x] 3.3 Update `BrainChatShell` for active chat id, load list, select/open, new chat, delete
- [x] 3.4 Update `ChatSidebar` to render history list with select + delete

## 4. Verify

- [x] 4.1 Update/add component or API tests as needed
- [x] 4.2 Run `pnpm run verify` clean
- [x] 4.3 Manual smoke: create/list/get/update/delete via `/api/chats` on running host (create → append events+session → list → reopen get → delete). Full LLM send skipped (no `COMMAND_CODE_API_KEY` in env).
