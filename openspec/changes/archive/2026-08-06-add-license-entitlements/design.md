## Context

Tenancy design separates **license entitlements** (SKU unlocks) from **instance policies** (day-to-day knobs). Policies already ship; license does not.

## Decisions

### 1. Key format
- **Choice:** `BRAIN1.<base64url JSON payload>.<hmac-sha256 base64url>` signed with `BRAIN_LICENSE_SECRET` or fallback `BETTER_AUTH_SECRET`.
- **Why:** Self-hostable offline verification; no license server required for v1.

### 2. Payload
```ts
{
  maxUsers: number | null, // null = unlimited
  sso: boolean,
  multiWorkspace: boolean,
  byoa: boolean,
  openSignup: boolean,
  issuedAt: string, // ISO
  expiresAt?: string | null
}
```

### 3. Unlicensed default
- **Choice:** All entitlements unlocked (`maxUsers: null`, all booleans true).
- **Why:** Self-host / local dev must not require a key.

### 4. Storage
- **Choice:** `.eve/brain-license.json` `{ key: string, updatedAt: number }` (mode 0600).
- **Why:** Matches other host secrets; not in chats DB.

### 5. Enforcement
- maxUsers: block open signup + invite register when `countUsers() >= maxUsers`
- openSignup / sso: reject policy PUT that sets disallowed signupMode
- multiWorkspace: reject team workspace create when false (personal still ok)
- byoa: reject workspace connection setup PUT when false

## Open Questions

_(none)_
