## Context

See proposal.md — Why. Today: tokens in `mcp-oauth-{name}.json` are keyed `user:brain:{userId}`; app credentials are host-wide files; pending Menu OAuth is `.eve/mcp-oauth-pending-{name}.json` (one per provider). Setup APIs require any session, not operator.

## Goals / Non-Goals

**Goals:**
- Concurrent Menu Connect for the same provider by different users does not overwrite each other’s pending PKCE/state.
- Only the operator can create/update/delete host app credentials via the setup API.
- Disconnect clears the caller’s token and the caller’s pending file only.
- Callback still completes without a session cookie (IdP redirect) but binds the grant to the pending attempt’s principal.

**Non-Goals:**
- Per-user OAuth **apps** (separate Slack client ids per Brain user).
- Changing mid-turn OAuth resume (eve session) beyond not sharing the menu pending file.
- Migrating legacy anonymous token keys.
- Full RBAC beyond operator vs everyone else for setup writes.

## Decisions

### 1. Pending files per user
- **Choice:** Store pending as `.eve/mcp-oauth-pending-{connection}-{userId}.json` (sanitize `userId` for filesystem). Callback finds the matching pending by scanning that connection’s pending files for `state`, or by reading a small `.eve/mcp-oauth-pending-index-{connection}.json` mapping `state → userId` written atomically with the pending file.
- **Prefer:** state→userId index file (O(1) callback) + per-user pending payload; clear both on success/failure for that user.
- **Why:** Avoids clobber; keeps principalId in the pending payload as today.
- **Alternative considered:** Single JSON map of userId→pending in one file — more lock contention; rejected for simplicity of atomic per-user writes.

### 2. Operator-only setup mutations
- **Choice:** `PUT`/`DELETE` `/api/connections/[id]/setup` require session user id === `requireOperatorUserId()` (same resolution as schedules: `BRAIN_OPERATOR_USER_ID` or first auth user). `GET` setup metadata remains available to any signed-in user so Connect UI can show redirect URI / whether credentials exist (never secrets).
- **Why:** One host Slack/Google app is shared infrastructure; rewriting it is an operator concern. Connect/Disconnect stay self-serve.
- **UI:** Non-operators who see `needs_setup` get a clear “ask the operator to configure” message; hide or disable Set up save for non-operators.
- **Alternative:** Per-user app credentials — rejected (breaks single redirect URI registration).

### 3. Disconnect pending scope
- **Choice:** `clearPending(connection, userId)` only; do not delete other users’ pending files or the whole-provider pending path.
- **Why:** Fixes current “disconnect aborts everyone’s in-flight Connect.”

### 4. Legacy pending path
- **Choice:** On read, if per-user pending missing but legacy `mcp-oauth-pending-{name}.json` exists and `principalId` matches the current user (authorize) or matches state (callback), consume and migrate/clear legacy file once.
- **Why:** Avoid breaking in-flight connects across deploy.

## Risks / Trade-offs

- **[Risk] Operator undefined on fresh host** → Setup writes return 503 with bootstrap/operator guidance (same as schedule operator resolution).
- **[Risk] Callback state scan without index races** → Use state index written with pending; reject unknown state.
- **[Risk] Non-operators stuck on needs_setup** → Document that operator must Set up once; env vars remain a deploy-time alternative.
- **[Trade-off] Host-wide app credentials remain shared** → Intentional; isolation is at the **grant** layer.

## Migration Plan

1. Ship pending path + index helpers; accept legacy pending file for one release.
2. Gate setup PUT/DELETE on operator; update integrations menu Set up affordance.
3. Adjust disconnect/authorize tests for multi-user pending.
4. Remove legacy pending path after a reasonable soak (optional follow-up).

## Open Questions

_(none — operator = existing `resolveOperatorUserId` is sufficient for v1)_
