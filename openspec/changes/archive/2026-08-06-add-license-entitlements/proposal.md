## Why

Instance policies exist, but nothing encodes commercial SKU caps (max users, SSO available, multi-workspace, BYOA). Without entitlements, every self-host install has every knob unlocked with no license surface.

## What Changes

- Persist an optional signed license key on the host
- Decode entitlements: max users, SSO available, multi-workspace, BYOA, open signup
- Unlicensed default remains fully unlocked for self-host convenience
- Instance admin UI to paste/clear a license key and see active entitlements
- Enforce caps on user creation, policy updates, workspace create, and BYOA setup

Non-goals: paid license server, cryptographic hardware roots, full SSO IdP login (only entitlement flag), billing UI.

## Capabilities

### New Capabilities

- `license-entitlements`: License key storage, entitlement resolution, and enforcement hooks

### Modified Capabilities

- `instance-policies`: Policy updates MUST respect license unlocks (e.g. open signup / sso-only)
- `workspace-invites` / `user-auth`: User creation MUST respect maxUsers when set

## Impact

- `lib/auth/license.ts` + auth-DB or `.eve` storage
- `/api/instance/license` + instance settings UI
- Gates on signup/invite register, create workspace, BYOA, policy PUT
