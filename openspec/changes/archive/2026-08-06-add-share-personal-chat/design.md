## Decisions

1. **One-way promote:** `personal` → `shared` only. Creator remains `user_id`.
2. **Who:** Chat owner only (`user_id` matches actor). Not workspace admins for someone else’s personal chat.
3. **Where:** Team workspaces only (same gate as creating shared chats).
4. **API:** `PATCH /api/chats/:id` with `{ "visibility": "shared" }` alongside existing fields.
5. **UI:** Share control on personal rows when `canCreateShared` and chat belongs to viewer.
