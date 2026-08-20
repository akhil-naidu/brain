## 1. Catalog and connections

- [x] 1.1 Add `rybbit` and `bytebot` to `HTTP_MCP_URL_CONNECTIONS` with `requiresBearer` and approval lists
- [x] 1.2 Treat Rybbit URL without token as needs_setup; Bytebot URL-only as connected
- [x] 1.3 Add `agent/connections/rybbit.ts` and `agent/connections/bytebot.ts`

## 2. Chat wiring

- [x] 2.1 Extend `EnabledConnections`, catalog, icons, Slack inbound, scheduled maps, fixtures
- [x] 2.2 Persist optional HTTP MCP secrets from Set up (`setupSecretPayload`)
- [x] 2.3 Reject Rybbit Set up saves without an API key

## 3. Docs and specs

- [x] 3.1 Customer docs, env, AGENTS.md, architecture copy
- [x] 3.2 OpenSpec delta on `mcp-connections`

## 4. Verify

- [x] 4.1 `pnpm run verify` clean
