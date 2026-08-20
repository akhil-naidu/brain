## Why

Operators asked to run Rybbit analytics and Bytebot desktop automation as Brain tools. Both already speak remote MCP over HTTP. Brain already has the MongoDB / MCP Toolbox HTTP MCP URL pattern; these two apps should use that path instead of OAuth, stdio, or vendoring the products.

## What Changes

- Add Rybbit as an HTTP MCP URL connection: Tools → Set up URL + **required** API key (cloud or self-hosted)
- Add Bytebot as an HTTP MCP URL connection: Tools → Set up URL + **optional** bearer (desktop MCP)
- Proxy both through `/api/mcp/http/{id}`; no Menu Connect OAuth
- Auto-approve reviewed Rybbit reads; require approval for Rybbit writes/`run_query` and all Bytebot desktop tools
- Persist optional HTTP MCP bearer tokens from the Set up dialog when typed
- Document both connections

Non-goals: Termix, BillionMail, dFlow templates, Rybbit OAuth, Bytebot Agent Tasks REST / UI embed, Vercel Connect, `vercelOidc()`, AI Gateway, stdio MCP.

Implementation sequencing: `docs/superpowers/plans/2026-08-20-rybbit-bytebot-mcp-connections.md`

## Capabilities

### New Capabilities

- _(none — extends existing mcp-connections)_

### Modified Capabilities

- `mcp-connections`: Add Rybbit (URL + required API key) and Bytebot (URL + optional bearer) HTTP MCP connections, approval rules, and no-OAuth Set up

## Impact

- `agent/lib/http-mcp-url.ts`, `http-mcp-credentials.ts`, `http-mcp-setup.ts`
- `agent/connections/rybbit.ts`, `agent/connections/bytebot.ts`
- `EnabledConnections`, `/tools`, icons, Slack inbound / scheduled maps
- Customer docs, `.env.example`, `AGENTS.md`
- No Vercel Connect; credentials stay workspace → host → env
