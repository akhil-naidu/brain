## 1. Auth foundation

- [x] 1.1 Add Better Auth (`better-auth`) dependency and document `BETTER_AUTH_SECRET` / public URL vars in `.env.example` (no Sign in with Vercel / `vercelOidc()`)
- [x] 1.2 Configure Better Auth with email/password + host SQLite (`node:sqlite`) under `.eve/brain-auth.sqlite`
- [x] 1.3 Expose Better Auth HTTP handler (`/api/auth/[...all]`) and session helpers for Next layouts/APIs
- [x] 1.4 Add bootstrap path for the first operator account when user count is zero (CLI and/or token-gated setup); keep open signup disabled afterward

## 2. Principal wiring

- [x] 2.1 Replace anonymous eve `AuthFn` with session-backed auth (cookie) + internal operator bearer for schedules
- [x] 2.2 Map session user id to eve `user` principal for MCP OAuth / connections
- [x] 2.3 Gate chat and connection API routes on authenticated session

## 3. Chat scoping

- [x] 3.1 Persist `user_id` on chat rows and scope list/get/update/delete
- [x] 3.2 Migrate existing chat rows to the first/bootstrap user (documented one-time backfill)

## 4. UI

- [x] 4.1 Sign-in and setup surfaces
- [x] 4.2 Sign-out in app shell
- [x] 4.3 Redirect unauthenticated app routes to sign-in / setup

## 5. Schedules / operator

- [x] 5.1 `BRAIN_OPERATOR_USER_ID` + `BRAIN_INTERNAL_TOKEN` for scheduled eve runs

## 6. Verification

- [x] 6.1 Unit tests for session/auth helpers and bootstrap gates
- [x] 6.2 `pnpm run verify` after Better Auth rewrite
- [x] 6.3 Confirm no Vercel OIDC / Connect / hosted chat DB deps were introduced
