## ADDED Requirements

### Requirement: Menu OAuth callback uses the public origin

The authorize endpoint MUST build `redirect_uri` from the public Brain origin, not the internal listen address. Resolution MUST prefer `BRAIN_PUBLIC_URL` / `BRAIN_PUBLIC_ORIGIN` when set, then the request `Origin`/`Referer`, then forwarded host/proto headers, and only then the internal request URL origin.

#### Scenario: Proxied host does not collapse to localhost

- **WHEN** the browser originates Menu Connect from `https://brain.example.com` while the Node server listens on `localhost:3000`
- **THEN** the OAuth `redirect_uri` uses `https://brain.example.com/api/connections/{id}/callback`
