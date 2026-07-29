# eve Agent App

This project uses the eve framework. Before writing code, read the relevant guide
from the installed eve package docs. In most installs, those docs are at
`node_modules/eve/docs/`. In workspaces or local package installs, resolve the
installed `eve` package location first and read its `docs/` directory. If
package docs are unavailable, use https://eve.dev/docs as a fallback.

## Infrastructure policy

This agent must stay **self-hostable and independent of Vercel infrastructure**.

- Models: Command Code (or other direct/third-party providers) — not Vercel AI Gateway
- Hosting: `eve build` + `eve start` (or any non-Vercel host)
- Auth: non-Vercel route auth only — never `vercelOidc()` or Vercel Connect
- Sandbox: microsandbox / Docker / local — not Vercel Sandbox
- OAuth for connections: `defineInteractiveAuthorization` or your own `getToken`
- ClickUp: official MCP at `agent/connections/clickup.ts` with self-hosted OAuth (no Vercel Connect)

See `.cursor/rules/no-vercel-infra.mdc`.
