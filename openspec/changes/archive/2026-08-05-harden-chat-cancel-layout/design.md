## Approach

- Stop: `session.cancel({ turnId })` only; composer stays busy until terminal boundary
- Dispose (New chat / select / delete): cancel while streaming, wait for boundary; 8s navigation-only detach; auth-only busy best-effort cancel then reset
- Mobile: fixed overlay drawer below `md`; desktop keeps width-collapsing sidebar

## Non-goals

Vercel infra, auth, persistence schema, stream rerender virtualization
