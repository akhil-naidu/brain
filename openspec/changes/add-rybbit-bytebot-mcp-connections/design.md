## Context

Brain already fronts Streamable HTTP MCP servers (MongoDB, MCP Toolbox) via `/api/mcp/http/[id]` and Tools → Set up (URL + optional bearer). Rybbit publishes official Streamable HTTP MCP (`/api/mcp`) with Bearer API keys. Bytebot publishes desktop MCP at `{origin}/mcp` (often unauthenticated locally). Spec: `docs/superpowers/specs/2026-08-20-rybbit-bytebot-mcp-connections-design.md`.

## Goals / Non-Goals

**Goals:**
- Named HTTP MCP connections for `rybbit` and `bytebot`
- Rybbit requires API key; Bytebot does not
- Approval lists as specified (Rybbit reads skip Auto HITL; Bytebot empty safe list)
- Optional HTTP MCP secrets persist from the Set up form

**Non-Goals:**
- Termix, BillionMail, generic custom MCP URL, dFlow templates
- Rybbit OAuth / DCR
- Bytebot Agent Tasks REST, VNC embed, SSE client, `mcp-remote`
- Vercel Connect, `vercelOidc()`, AI Gateway

## Decisions

1. **Reuse HTTP MCP URL catalog** — add two entries; clone `mongodb.ts` for connection modules.
2. **`requiresBearer` on catalog** — Rybbit true; others false. Setup JSON maps that to `requiresClientSecret`.
3. **Fail closed** — unknown Rybbit tools and all Bytebot tools require approval in Auto.
4. **Bytebot transport** — existing proxy `fetch`. Operators paste a Streamable HTTP gateway URL if SSE-only POST fails.
5. **Fix optional secret save** — `setupSecretPayload` so MongoDB/Toolbox/Bytebot tokens typed in the dialog are posted.

## Risks / Trade-offs

- Bytebot MCP-Nest may be SSE-first → document gateway fallback; do not add SSE in v1.
- Rybbit `run_query` is read-only SQL but paused for approval (power vs convenience).
