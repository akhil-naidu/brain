## Decisions

1. **`revision` integer** on `chat`, default 0, incremented on every successful mutating update.
2. **CAS:** `UpdateChatInput.expectedRevision` optional for personal (ignored or checked); for shared chats PATCH **requires** `expectedRevision` and returns 409 when mismatched.
3. **Turn lock** columns: `turn_lock_user_id`, `turn_lock_until` (ISO). Shared chat only.
   - Acquire: owner of lock or expired → set actor + until (now+5m)
   - Heartbeat: lock holder may refresh until during turn
   - Release: lock holder clears on turn end / cancel
   - Others get 409 with message that another member holds the turn
4. **API shape:** extend PATCH body with `expectedRevision`, `turnLock: "acquire" | "release" | "heartbeat"`.
5. **Client:** keep `revisionRef`; on create/load/update success store revision; shared chats call acquire before send and release in finally; on 409 refetch + show error.

## Risks

- Abandoned tabs hold lock until TTL — 5 minutes is acceptable
- Personal chats stay last-write-wins (no lock) to avoid friction
