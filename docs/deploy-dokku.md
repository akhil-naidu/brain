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

## Postgres (required)

Auth, workspaces, chats, playbooks, and schedules use **one operator-provided
Postgres database**. There is no SQLite fallback and no SQLite→Postgres data
migration — provision an empty database and let Brain apply schema on boot.

1. Provision Postgres 16+ (managed or self-hosted; not Neon-required).
2. Create a database and a role with create/table privileges.
3. Set `BRAIN_DATABASE_URL` (or `DATABASE_URL`) before the first healthy boot.
4. Prefer SSL when the provider requires it (e.g. `?sslmode=require`).

Local reference: `docker compose up -d db` →
`postgres://brain:brain@127.0.0.1:5432/brain` (see `.env.example`).

## One-time Dokku setup

```bash
# Use Dockerfile builder (required — do not leave herokuish selected)
dokku builder:set brain selected dockerfile

# HTTP → container port 3000
dokku ports:set brain http:80:3000
# optional TLS terminator on 443:
# dokku ports:add brain https:443:3000

# Runtime secrets (set before first healthy boot)
dokku config:set brain \
  COMMAND_CODE_API_KEY="..." \
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  BRAIN_DATABASE_URL="postgres://USER:PASS@HOST:5432/brain" \
  BRAIN_PUBLIC_URL="https://<your-host>" \
  BETTER_AUTH_URL="https://<your-host>" \
  BRAIN_BOOTSTRAP_TOKEN="$(openssl rand -base64 32)" \
  NODE_ENV=production
```

Optional but common:

```bash
dokku config:set brain \
  BRAIN_INTERNAL_TOKEN="$(openssl rand -base64 32)" \
  BRAIN_INTERNAL_URL="http://127.0.0.1:3000"
```

`BRAIN_PUBLIC_URL` / `BETTER_AUTH_URL` are the public site origin for cookies and
Menu Connect OAuth `redirect_uri` values (ClickUp, Slack, …). Without them,
Brain falls back to the browser `Origin` / `X-Forwarded-*` headers; set the env
explicitly on Dokku so callbacks never collapse to `http://localhost:3000`.

`BRAIN_BOOTSTRAP_TOKEN` is required in production for creating the first
operator account (`/setup` or `node scripts/bootstrap-operator.mjs`).

MCP OAuth tokens still live under `.eve/` on the app filesystem — mount a
persistent volume for that directory if you rely on Menu Connect across deploys.

Redeploy from GitHub / dflow after the `Dockerfile` is on `main`.

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
# Expect no Missing BRAIN_DATABASE_URL / Postgres connection errors
curl -I https://<your-host>/
curl -sS https://<your-host>/eve/v1/health
```

Then open `/setup` with `BRAIN_BOOTSTRAP_TOKEN`, create the operator, sign in,
and send a chat.

Healthy chat needs the start-production eve lines and a successful
`/eve/v1/health` (not `ECONNREFUSED 127.0.0.1:4274`).
