## 1. APIs

- [x] 1.1 Add `GET /api/auth/signup-status` (public) returning signupMode, openSignupAllowed, bootstrapAllowed
- [x] 1.2 Add `POST /api/workspaces/invites/register` for token + email + password (invite gate, accept, session)
- [x] 1.3 Add `GET /api/workspaces/invites/preview?token=` (public) for invite landing metadata without leaking secrets beyond workspace name / email bind / expiry

## 2. Auth pages

- [x] 2.1 Add `/sign-up` page gated by signup status; link from `/sign-in` when open
- [x] 2.2 Add `/invite/[token]` for accept (signed-in) and register (logged-out)
- [x] 2.3 Update `/sign-in` copy for invite-only vs open signup

## 3. Workspace and settings UI

- [x] 3.1 Rebuild workspace switcher with menu + create dialog (fix compact mode)
- [x] 3.2 Add `/settings/workspace` invite management for workspace admins
- [x] 3.3 Add `/settings/instance` policy form for instance admins
- [x] 3.4 Link settings from app shell (and hide instance link when not admin)

## 4. Tests and verify

- [x] 4.1 Tests for signup-status and invite register under invite-only
- [x] 4.2 Run `pnpm run openspec:validate` and `pnpm run verify`
