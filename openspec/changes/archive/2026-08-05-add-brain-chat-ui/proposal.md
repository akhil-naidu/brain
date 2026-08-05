## Why

Brain is currently an eve agent driven from the terminal. Operators need a template-like browser chat UI branded as Brain so everyday work (messages, tools, HITL, MCP authorize) happens in the UI. Auth and durable chat storage are explicitly out of scope for v1; the app must stay self-hostable without Vercel platform services.

## What Changes

- Add a Next.js frontend in this repo mounted with `withEve()` beside existing `agent/`
- Ephemeral chat via `useEveAgent()` (refresh clears history; no Neon/Drizzle chat APIs)
- Template-like shell: sidebar chrome, composer, streaming messages/tools/HITL
- Brain branding: product name, geometric straight-line brain mark, teal/navy theme
- Composer connections menu for ClickUp / Slack / Asana / Gmail with turn `clientContext`
- Open channel auth via fixed anonymous `user` principal (local/trusted only)
- **Non-goals:** Better Auth / Sign in with Vercel, persisted chat history, rate limiting, file uploads, Vercel Connect connectors, AI Gateway as primary model path

## Capabilities

### New Capabilities
- `chat-ui`: Ephemeral browser chat shell, streaming, composer, sidebar new-chat reset
- `brain-branding`: Brain naming, geometric mark, teal/navy visual identity

### Modified Capabilities
- `agent-runtime`: Browser-open anonymous user principal for same-origin UI + MCP OAuth
- `mcp-connections`: UI integrations menu and per-turn enabled-connection context

## Impact

- New: `app/`, `components/`, `next.config.ts`, Tailwind/UI deps
- Modify: `agent/channels/eve.ts`, `package.json` scripts (`next dev` primary for UI)
- Keep unchanged: `docs/superpowers/plans/**` (executable ordered plans), existing MCP OAuth libs
- Reference mirror: `/Users/dev/github/tmp/eve-chat-template`
- Design: `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`
