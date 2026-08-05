## Why

Menu Connect OAuth used `request.url` origin for `redirect_uri`, which becomes `http://localhost:3000` behind Dokku/proxies and breaks ClickUp (and other) sign-in.

## What Changes

- Resolve public origin via `BRAIN_PUBLIC_URL`, browser Origin/Referer, then forwarded headers
- Document the env var for Dokku / `.env.example`
- Cover resolver with unit tests

## Non-goals

- Changing mid-turn eve HITL callback base URL (separate eve callbackBaseUrl path)
- Vercel infra
