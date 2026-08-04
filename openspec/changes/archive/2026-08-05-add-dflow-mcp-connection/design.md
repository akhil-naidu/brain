## Context

See proposal.md — Why. Live dFlow Cloud metadata:

- MCP: `https://app.dflow.sh/api/mcp`
- Resource: `https://app.dflow.sh`
- Authorize / token / register on `https://app.dflow.sh`
- Public clients only (`token_endpoint_auth_method=none`), scope `mcp`, PKCE S256, DCR

## Goals / Non-Goals

**Goals:**
- First-class dFlow connection like ClickUp (DCR, no client env)
- Menu toggle, status, and Connect work without code changes beyond provider list
- Safe read tools skip HITL; create/update/GitHub setup tools require approval

**Non-Goals:**
- Self-hosted dFlow base URL picker (v1 pins Cloud URL; self-host can fork later)
- Full deploy/create-app tooling beyond what MCP exposes
- Generic “add any MCP URL” UI

## Decisions

1. **Reuse `defineMcpOAuthConnection`** — same stack as ClickUp.
2. **`resource: https://app.dflow.sh`** — matches protected-resource metadata (not the `/api/mcp` path).
3. **Scope `mcp`** — required by dFlow authorize validation.
4. **Wire into `CHAT_CONNECTION_PROVIDERS` + `EnabledConnections`** so status/Connect/menu pick it up automatically.

## Risks / Trade-offs

- [No refresh_token grant in dFlow metadata] → Re-Connect when the JWT expires; acceptable for v1.
- [Cloud-only URL] → Document; self-host operators change `mcpUrl` later if needed.
