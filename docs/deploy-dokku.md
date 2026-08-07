# Deploy Brain on Dokku / dflow

Brain is a Next.js + `withEve()` app. Prefer the **Dockerfile** builder so the
server never has to download Node from `nodejs.org` during build (herokuish
often fails with SSL timeouts on constrained hosts).

## How chat works in production

`withEve()` proxies `/eve/v1/*` to a local eve Nitro server on `:4274`.
`scripts/start-production.mjs` starts that server from `.output/server/index.mjs`,
waits for the port, then boots Next on `:3000`.

The Docker image runs `eve build && next build`, copies `.output` + the start
script, and uses that script as `CMD`. If eve never binds `:4274`, chat fails
with `ECONNREFUSED 127.0.0.1:4274`.

## One-time Dokku setup

```bash
# Use Dockerfile builder (required — do not leave herokuish selected)
dokku builder:set brain selected dockerfile

# HTTP → container port 3000
dokku ports:set brain http:80:3000
# optional TLS terminator on 443:
# dokku ports:add brain https:443:3000

# Runtime secrets (set whatever you use locally)
dokku config:set brain \
  COMMAND_CODE_API_KEY="..." \
  BRAIN_PUBLIC_URL="https://<your-host>" \
  NODE_ENV=production
```

`BRAIN_PUBLIC_URL` is the public site origin used for Menu Connect OAuth
`redirect_uri` values (ClickUp, Slack, …). Without it, Brain falls back to the
browser `Origin` / `X-Forwarded-*` headers; set the env explicitly on Dokku so
callbacks never collapse to `http://localhost:3000`.

## Persistent data (`/app/.eve`)

Chat history, OAuth tokens, Snowflake Set up, and eve workflow data live under
`/app/.eve`. Mount a Dokku/dflow volume there so redeploys do not wipe state:

| Host path | Container path |
| --- | --- |
| `/var/lib/dokku/data/storage/brain/default` | `/app/.eve` |

The image entrypoint chowns that mount to uid/gid `1001` (`nextjs`) on start.
If an older deploy crash-loops with `EACCES` on `/app/.eve/.workflow-data`
before this entrypoint is live, fix the host directory once:

```bash
sudo chown -R 1001:1001 /var/lib/dokku/data/storage/brain/default
dokku ps:restart brain
```

### Snowflake Set up in production

Eve bakes the Snowflake MCP `url` into the Nitro bundle at `eve build` time.
Production always loads that bundled manifest (not a live re-read of `.eve`).

Brain handles this in two ways:

1. **Connections → Snowflake → Set up** writes `.eve/mcp-app-credentials-snowflake.json`.
   `start-production.mjs` patches the baked URL under `.output`, then restarts eve.
2. **Optional build-time bake:** set `SNOWFLAKE_MCP_URL` as a Docker build-arg /
   Dokku config so `eve build` embeds the account URL up front. The PAT can stay
   runtime-only (`SNOWFLAKE_PAT_TOKEN` or Set up).

```bash
# Runtime (PAT + URL via Set up, or env fallback)
dokku config:set brain \
  SNOWFLAKE_MCP_URL="https://<account>.snowflakecomputing.com/api/v2/databases/<db>/schemas/<schema>/mcp-servers/<name>" \
  SNOWFLAKE_PAT_TOKEN="..."

# Ensure Dockerfile builds see SNOWFLAKE_MCP_URL (Dokku build-arg)
dokku docker-options:add brain build '--build-arg SNOWFLAKE_MCP_URL'
```

After Set up on a deployed image that includes the patcher, watch logs for:

```text
[start-production] Snowflake bundle URL patched (credential-change): ...
[start-production] eve reloaded after Snowflake credential change
```

If tools still 404 on an older image without the patcher, redeploy this repo then
either re-run Set up or `dokku ps:restart brain`.

## If you must stay on herokuish

Increase curl patience and retry (still depends on reaching nodejs.org):

```bash
dokku config:set brain CURL_CONNECT_TIMEOUT=180 CURL_TIMEOUT=1200
```

Ensure a web process exists (`Procfile` → `node scripts/start-production.mjs`).

Note: the repo uses **pnpm** (`pnpm-lock.yaml`). The Dockerfile installs with
`pnpm install --frozen-lockfile`; runtime uses plain `node` (no Corepack).

## Smoke check

```bash
dokku logs brain -t
# Expect: "[start-production] starting eve..." then "eve is up; starting Next..."
curl -I https://<your-host>/
curl -sS https://<your-host>/eve/v1/health
```

Healthy chat needs the start-production eve lines and a successful
`/eve/v1/health` (not `ECONNREFUSED 127.0.0.1:4274`).
