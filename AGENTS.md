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
- ClickUp: official MCP with self-hosted OAuth / DCR (`agent/connections/clickup.ts`)
- Slack / Asana / Gmail: official MCP with self-hosted OAuth + env client credentials (`agent/connections/{slack,asana,gmail}.ts`)

See `.cursor/rules/no-vercel-infra.mdc`.

## OpenSpec

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for behavior specs and change proposals.

- Specs: `openspec/specs/`
- Active changes: `openspec/changes/`
- Config: `openspec/config.yaml`
- Cursor slash commands: `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, `/opsx-explore`, …
- Validate: `npm run openspec:validate`

Ordered implementation checklists for the Brain chat UI live separately in
`docs/superpowers/plans/` (do not relocate). Design overview:
`docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`.
