# Rybbit and Bytebot MCP connections

**Status:** Implemented  
**Date:** 2026-08-20  
**Depends on:** HTTP MCP URL connections (`agent/lib/http-mcp-url.ts`, MongoDB / MCP Toolbox)

Add Rybbit analytics and Bytebot desktop as first-class Brain MCP connections. Operators configure them from Tools → Set up (URL + token). Brain does not vendor, embed, or spawn either product.

## Goal

A workspace admin can point Brain at a Rybbit MCP endpoint (cloud or self-hosted) and a Bytebot desktop MCP endpoint. After Set up, Agent mode can call those tools under the existing approval and screening rules. No OAuth Connect, no stdio MCP, no dFlow templates in this change.

## Decisions

| Topic | Choice |
| --- | --- |
| Integration style | Two named HTTP MCP URL connections, same as MongoDB / Toolbox |
| Rybbit auth | MCP URL + **required** Bearer API key. No OAuth in v1 |
| Bytebot auth | MCP URL + **optional** Bearer (desktop MCP is unauthenticated by default) |
| Default Rybbit URL hint | `https://app.rybbit.io/api/mcp` |
| Default Bytebot URL hint | `http://localhost:9990/mcp` |
| Env fallback | `RYBBIT_MCP_URL` / `RYBBIT_MCP_TOKEN`; `BYTEBOT_MCP_URL` / `BYTEBOT_MCP_TOKEN` |
| Credential scopes | Existing workspace → host → env BYOA path |
| Bytebot surface | Official desktop MCP only. Not Agent Tasks REST, not VNC UI embed |
| Bytebot transport | Existing Brain HTTP proxy (`fetch` to the pasted URL). If the instance only speaks legacy SSE and POST fails, the operator pastes a Streamable HTTP gateway URL. Brain does not add an SSE client or `mcp-remote` in v1 |
| Generic “any MCP URL” | Out of scope |
| Termix / BillionMail / dFlow templates | Out of scope |

## Non-goals

- dFlow official/community templates for these apps
- Termix, BillionMail, or a generic custom MCP connector
- Rybbit OAuth / DCR
- Vendoring Bytebot or Rybbit into the Brain process
- Embedding Bytebot’s task UI or noVNC in Brain chrome
- Bytebot Agent API (`:9991/tasks`)
- Community stdio wrappers (`spark-mcp`, `billionmail-mcp-server`)
- Vercel Connect, AI Gateway, or `vercelOidc()`

## Architecture

Neither product is bundled. Brain stores an MCP URL (and optional/required bearer) and fronts it through the existing loopback proxy so eve can use a stable same-origin URL.

```text
/tools Set up  (workspace | host | env)
        │
        ▼
 resolveHttpMcpCredentials
        │
        ▼
 /api/mcp/http/rybbit   ──►  https://app.rybbit.io/api/mcp   Authorization: Bearer <key>
 /api/mcp/http/bytebot  ──►  http://host:9990/mcp            optional Bearer
        │
        ▼
 agent/connections/{rybbit,bytebot}.ts
   defineMcpClientConnection + resolveConnectionToolApproval
```

Status is `needs_setup` until credentials resolve; then `connected` (same as MongoDB). There is no Menu Connect / Disconnect OAuth for these apps.

## Components

1. **Catalog entries** — add `rybbit` and `bytebot` to `HTTP_MCP_URL_CONNECTIONS` with display names, env keys, placeholders, setup hints, `requiresBearer`, and `safeReadOnlyTools`.
2. **Connection modules** — `agent/connections/rybbit.ts` and `agent/connections/bytebot.ts` copied from the MongoDB/Toolbox pattern (loopback proxy URL, setup error → `ConnectionAuthorizationRequiredError`, mint proxy token, approval via `resolveConnectionToolApproval`).
3. **Required bearer** — extend `HttpMcpUrlConnection` with `requiresBearer: boolean` (default false). Rybbit `true`; Bytebot `false`. `getHttpMcpCredentialSetupError` treats a Rybbit URL without a non-empty token as not configured. Setup PUT rejects Rybbit saves without a token.
4. **Setup dialog** — HTTP MCP setup JSON: Rybbit `requiresClientSecret: true` so the existing dialog posts the API key. Bytebot keeps optional secret. Also send a non-empty optional secret on save (today the dialog only posts `clientSecret` when `requiresClientSecret` is true, so optional MongoDB/Toolbox/Bytebot tokens from the form never persist). Fix that so Bytebot’s optional token can be saved from UI.
5. **Chat wiring** — `EnabledConnections`, default off, `CONNECTION_ITEMS`, icons, `HTTP_MCP_URL_CONNECTION_IDS`, Slack inbound + scheduled connection maps, agent instructions, home “Works with” row, docs index/meta, `.env.example`, `AGENTS.md`.
6. **Icons** — simple SVG marks in `components/icons.tsx` and `lib/chat/connection-icon-element.ts` (Rybbit frog-green; Bytebot geometric desktop). No external image URLs required.

## Data flow

1. Admin opens `/tools` → Rybbit or Bytebot → Set up.
2. Saves URL (and Rybbit API key) at workspace or host scope, or sets env.
3. Status becomes `connected`. User toggles the app on for the chat.
4. Agent turn: eve calls the Brain proxy with a short-lived proxy JWT; the proxy forwards to the upstream MCP URL, attaching the stored Bearer when present.
5. Tool results go through existing Auto/Strict screening. Dangerous posture skips screening as today.

Resolve order stays workspace UI → host UI → env.

## Approval and safety

Instance posture still applies (`auto` / `strict` / `dangerous`). Command-policy denials still win (including `DROP TABLE` / `TRUNCATE` inside Rybbit `run_query` arguments).

**Rybbit — skip approval (`not-applicable`) in Auto** for reviewed reads only:

- Analytics: `get_overview`, `get_overview_timeseries`, `get_breakdown`, `get_live_stats`, `get_event_names`, `get_errors`, `get_web_vitals`, `get_retention`, `get_journeys`
- Sites: `list_sites`, `get_site`
- Goals/funnels: `get_goals`, `get_funnels`, `analyze_funnel`
- People: `get_users`, `get_user`
- Org: `list_members`, `list_teams`
- Raw: `get_sessions`, `get_session`, `get_events`, `get_query_schema`

**Rybbit — require approval** (and fail closed for unknown names): `create_site`, `update_site_config`, `delete_site`, `create_goal`, `update_goal`, `delete_goal`, `save_funnel`, `delete_funnel`, `identify_user`, `update_user_traits`, `delete_user`, `add_member`, `update_member_site_access`, `create_team`, `update_team`, `delete_team`, `run_query`.

`run_query` is read-only SQL at Rybbit but is powerful enough that Auto must pause for approval.

**Bytebot — empty `safeReadOnlyTools`.** Every desktop tool (screenshot, click, type, and unknown names) requires approval in Auto. Fail closed: unknown tool names are not treated as reads.

Ask mode continues to deny all connection tools.

## Error handling

| Situation | Behavior |
| --- | --- |
| No URL (and Rybbit: no token) | Status `needs_setup`; tool call raises authorization/setup error pointing at Set up |
| Invalid URL | Set up PUT `400` with the existing parse error |
| Rybbit 401 | Surface as a tool/connection error; do not mark Brain session unauthenticated |
| Bytebot unreachable / SSE-only POST failure | Tool error; docs tell the operator to confirm Streamable HTTP or put a gateway in front |
| Member cannot Set up | Existing “workspace admin must set up” copy |
| Ask mode | Connection tools denied |

Do not probe the upstream MCP server from the Set up save path (no live health check in v1).

## Testing

Extend existing HTTP MCP tests rather than adding a new framework.

- Catalog: `HTTP_MCP_URL_CONNECTIONS` includes `mongodb`, `toolbox`, `rybbit`, `bytebot`.
- Rybbit URL without token → `needs_setup`; URL + token → `connected`.
- Bytebot URL without token → `connected`.
- `connectionUsesHttpMcpUrl` / `connectionOffersAppSetup` true; no OAuth Connect/Disconnect.
- Approval: Rybbit `list_sites` Auto → `not-applicable`; `delete_site` and `run_query` Auto → `user-approval`; Bytebot screenshot/click Auto → `user-approval`.
- `EnabledConnections` fixtures in composer, turn-context, integrations-menu, features-catalog tests include the new keys.
- Setup dialog: optional HTTP MCP secret is included in the save payload when non-empty.

No live Rybbit Cloud or Bytebot Docker in CI.

## Docs

- `content/docs/connections/rybbit.mdx` — cloud vs self-hosted URL, create API key, env vars.
- `content/docs/connections/bytebot.mdx` — run desktop, paste `{origin}/mcp`, optional auth, SSE vs Streamable HTTP note.
- Update connections index auth-mode table, `meta.json`, environment reference, `AGENTS.md`, `agent/instructions.md`.

## Files (expected)

- `agent/lib/http-mcp-url.ts`, `agent/lib/http-mcp-credentials.ts`, `agent/lib/http-mcp-setup.ts`
- `agent/connections/rybbit.ts`, `agent/connections/bytebot.ts`
- `lib/chat/connection-catalog.ts`, `app/_components/chat-shell-context.tsx`
- `components/icons.tsx`, `lib/chat/connection-icon-element.ts`
- `lib/features/catalog.ts`, `agent/instructions.md`, `AGENTS.md`, `.env.example`
- `lib/chat/slack-inbound/dispatch.ts`, `lib/chat/run-scheduled-prompt.ts`
- `components/chat/connection-setup-dialog.tsx` (optional secret persist)
- Docs + tests listed above
- OpenSpec: delta on `mcp-connections` when this change is proposed/applied

## Success

- `/tools` lists Rybbit and Bytebot with Set up, no Connect.
- Saving Rybbit URL + API key (or env) marks it connected; Agent can call `list_sites` without HITL in Auto.
- Saving Bytebot URL marks it connected; a click/type/screenshot call pauses for approval in Auto.
- `pnpm run verify` stays clean.
