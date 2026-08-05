## Context

Static-credential MCP providers (Slack, Asana, Gmail) previously required env vars before Menu Connect. DCR providers (ClickUp, dFlow) already work without app credentials.

## Goals / Non-Goals

**Goals:**

- Configure client id/secret from the UI without redeploy
- Prefer host-local stored credentials over env
- Keep Connect/Disconnect flows unchanged once credentials exist

**Non-Goals:**

- Multi-user credential vaults or encrypted remote secret stores
- Configuring `COMMAND_CODE_API_KEY` in this UI
- Changing ClickUp/dFlow DCR

## Decisions

1. **Store path** — `.eve/mcp-app-credentials-{name}.json` with directory `0o700` and file `0o600`, same trust model as existing token files under `.eve/`.
2. **Resolve order** — stored credentials win; env is fallback for deploys that inject secrets.
3. **API** — GET returns metadata + callback URL only (never secrets); PUT writes; DELETE clears stored only (env remains).
4. **UI** — Configure only when status is `needs_setup`; dialog nested beside the menu; close menu when opening dialog.

## Risks / Trade-offs

- Host-local plaintext secrets — acceptable for single-tenant trusted Brain; document `.eve/` gitignore (already ignored).
- Nested Dialog under DropdownMenu — close menu on Configure to avoid focus traps.
