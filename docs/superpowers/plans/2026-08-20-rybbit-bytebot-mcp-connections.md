# Rybbit and Bytebot MCP Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rybbit and Bytebot as first-class HTTP MCP URL connections (Tools → Set up), matching MongoDB / MCP Toolbox.

**Architecture:** Register both in `HTTP_MCP_URL_CONNECTIONS`. Brain stores MCP URL + token (Rybbit token required; Bytebot optional) and proxies via `/api/mcp/http/{id}`. Eve `defineMcpClientConnection` modules mirror `agent/connections/mongodb.ts`. No OAuth Connect.

**Tech Stack:** Existing HTTP MCP URL stack (`agent/lib/http-mcp-url.ts`, `http-mcp-credentials.ts`, `http-mcp-setup.ts`, `app/api/mcp/http/[id]/route.ts`), vitest, OpenSpec `mcp-connections`.

## Global Constraints

- No Vercel Connect, `vercelOidc()`, AI Gateway, Neon, or stdio MCP spawn
- Package manager is pnpm; quality gate is `pnpm run verify`
- Do not vendor Bytebot or Rybbit; do not add Termix, BillionMail, or dFlow templates
- Do not commit unless the user asks
- Spec: `docs/superpowers/specs/2026-08-20-rybbit-bytebot-mcp-connections-design.md`

---

## File map

| File | Role |
| --- | --- |
| `agent/lib/http-mcp-url.ts` | Catalog: `rybbit`, `bytebot`, `requiresBearer`, safe-read lists |
| `agent/lib/http-mcp-credentials.ts` | Rybbit without token → not configured |
| `agent/lib/http-mcp-setup.ts` | Setup JSON `requiresClientSecret` from `requiresBearer`; save rejects missing Rybbit key |
| `agent/connections/rybbit.ts` | Eve HTTP MCP client (MongoDB clone) |
| `agent/connections/bytebot.ts` | Eve HTTP MCP client (MongoDB clone) |
| `lib/chat/connection-setup-secret.ts` | Shared save-payload helper so optional tokens persist |
| `components/chat/connection-setup-dialog.tsx` | Use that helper |
| Chat wiring | `EnabledConnections`, catalog, icons, Slack/scheduled maps, fixtures |
| Docs | `content/docs/connections/{rybbit,bytebot}.mdx` + index/env/AGENTS |

---

### Task 1: HTTP MCP catalog, required bearer, connections, tests

**Files:**
- Modify: `agent/lib/http-mcp-url.ts`, `agent/lib/http-mcp-credentials.ts`, `agent/lib/http-mcp-setup.ts`
- Create: `agent/connections/rybbit.ts`, `agent/connections/bytebot.ts`
- Test: `tests/agent/http-mcp-url-connections.test.ts`

**Interfaces:**
- Consumes: existing `HttpMcpUrlConnection`, `resolveHttpMcpCredentials`, `writeStoredHttpMcpCredentials`
- Produces: `requiresBearer?: boolean` on `HttpMcpUrlConnection`; `rybbitHttpMcp` / `bytebotHttpMcp`; `RYBBIT_MCP_URL` / `RYBBIT_MCP_TOKEN`; `BYTEBOT_MCP_URL` / `BYTEBOT_MCP_TOKEN`

- [ ] **Step 1: Extend `http-mcp-url-connections` tests** so they fail on the old two-item catalog and missing bearer rules.

Add cases:

```ts
expect(HTTP_MCP_URL_CONNECTIONS.map((c) => c.name)).toEqual([
  "mongodb",
  "toolbox",
  "rybbit",
  "bytebot",
]);
// Rybbit URL without token → needs_setup
// Rybbit URL + token → connected
// Bytebot URL without token → connected
// approvalForTool rybbit list_sites → not-applicable
// approvalForTool rybbit delete_site / run_query → user-approval
// approvalForTool bytebot screenshot (empty safe list) → user-approval
```

- [ ] **Step 2: Run the test file; expect FAIL** (catalog still `mongodb`, `toolbox`).

Run: `pnpm exec vitest run tests/agent/http-mcp-url-connections.test.ts`

- [ ] **Step 3: Implement catalog + credential/setup + connection modules**

`HttpMcpUrlConnection` gains `readonly requiresBearer?: boolean`.

Rybbit `safeReadOnlyTools` (exact names):

`get_overview`, `get_overview_timeseries`, `get_breakdown`, `get_live_stats`, `get_event_names`, `get_errors`, `get_web_vitals`, `get_retention`, `get_journeys`, `list_sites`, `get_site`, `get_goals`, `get_funnels`, `analyze_funnel`, `get_users`, `get_user`, `list_members`, `list_teams`, `get_sessions`, `get_session`, `get_events`, `get_query_schema`

Bytebot `safeReadOnlyTools: []`, `requiresBearer` omitted/false.

`getHttpMcpCredentialSetupError`: if `requiresBearer` and resolved URL has no `bearerToken`, return `Set up ${displayName} to continue`.

`saveWorkspaceHttpMcpSetup` / `saveHostHttpMcpSetup`: if `requiresBearer` and neither new nor existing token, throw `${displayName} needs an API key.`

`HttpMcpSetupResponse.requiresClientSecret` / `optionalClientSecret` become booleans: Rybbit `requiresClientSecret: true`, `optionalClientSecret: false`; others keep optional secret.

Clone `mongodb.ts` for `rybbit.ts` / `bytebot.ts` with matching names, proxy URLs, and descriptions.

- [ ] **Step 4: Re-run the test file; expect PASS**

---

### Task 2: Chat wiring, icons, fixtures

**Files:**
- Modify: `app/_components/chat-shell-context.tsx`, `lib/chat/connection-catalog.ts`, `components/icons.tsx`, `lib/chat/connection-icon-element.ts`, `lib/features/catalog.ts`, `components/features/features-showcase.tsx`, `lib/chat/slack-inbound/dispatch.ts`, `lib/chat/run-scheduled-prompt.ts`, `agent/instructions.md`
- Test fixtures: `tests/lib/turn-client-context.test.ts`, `tests/lib/composer-commands.test.ts`, `tests/components/integrations-menu.test.tsx`, `tests/app/ephemeral-agent-chat.test.tsx`, `tests/lib/features-catalog.test.ts`

- [ ] **Step 1: Add `rybbit` and `bytebot` to every `EnabledConnections` object** so typecheck fails until the type is updated, then update the type and defaults (`false`). Add catalog items, SVG icons (Rybbit green frog-ish mark; Bytebot monitor), home row, Slack/scheduled maps (`true` like mongodb), instructions list, integrations-menu mock statuses, features-catalog expected ids.

- [ ] **Step 2: Run** `pnpm exec vitest run tests/lib/turn-client-context.test.ts tests/lib/composer-commands.test.ts tests/components/integrations-menu.test.tsx tests/lib/features-catalog.test.ts tests/app/ephemeral-agent-chat.test.tsx` **expect PASS** (and `pnpm run typecheck` clean for these keys).

---

### Task 3: Setup dialog optional secret persist

**Files:**
- Create: `lib/chat/connection-setup-secret.ts`
- Modify: `components/chat/connection-setup-dialog.tsx`
- Test: `tests/lib/connection-setup-secret.test.ts`

- [ ] **Step 1: Failing tests** for `setupSecretPayload`: required secret with empty string → undefined; required with value → trimmed; optional with value → trimmed; neither flag → undefined.

- [ ] **Step 2: Implement**

```ts
export function setupSecretPayload(input: {
  readonly requiresClientSecret: boolean;
  readonly optionalClientSecret?: boolean;
  readonly clientSecret: string;
}): string | undefined {
  if (!input.requiresClientSecret && input.optionalClientSecret !== true) {
    return undefined;
  }
  const trimmed = input.clientSecret.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
```

Dialog save uses `clientSecret: setupSecretPayload({ requiresClientSecret: Boolean(info?.requiresClientSecret), optionalClientSecret: info?.optionalClientSecret, clientSecret })`.

- [ ] **Step 3: Tests PASS**

---

### Task 4: Docs, env, OpenSpec

**Files:**
- Create: `content/docs/connections/rybbit.mdx`, `content/docs/connections/bytebot.mdx`
- Modify: `content/docs/connections/index.mdx`, `content/docs/connections/meta.json`, `content/docs/reference/environment.mdx`, `.env.example`, `AGENTS.md`, `README.md`, `docs/brain-technical-architecture.md`
- OpenSpec change `add-rybbit-bytebot-mcp-connections` delta on `mcp-connections`

- [ ] **Step 1: Customer docs** — Rybbit cloud URL `https://app.rybbit.io/api/mcp` or `{BASE_URL}/api/mcp` plus API key; Bytebot `{origin}/mcp`, optional bearer, SSE vs Streamable HTTP note.
- [ ] **Step 2: OpenSpec artifacts** (proposal, spec delta, design, tasks) matching the superpowers spec.
- [ ] **Step 3: `pnpm run openspec:validate`**

---

### Task 5: Quality gate

- [ ] **Step 1: `pnpm run verify`**
- [ ] **Step 2: Fix any lint/type/test failures**
- [ ] **Step 3: Confirm `/tools` types include Rybbit and Bytebot Set up (no Connect)**

## Verifiable conclusion

- Catalog ids: mongodb, toolbox, rybbit, bytebot
- Rybbit needs URL+token; Bytebot needs URL only
- Auto: Rybbit reads skip HITL; writes and `run_query` pause; Bytebot tools pause
- Optional HTTP MCP token is posted from Set up when typed
- `pnpm run verify` exit 0
