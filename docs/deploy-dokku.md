# Deploy Brain on Dokku / dflow

Brain is a Next.js + `withEve()` app. Prefer the **Dockerfile** builder so the
server never has to download Node from `nodejs.org` during build (herokuish
often fails with SSL timeouts on constrained hosts).

## How chat works in production

`next start` serves the UI on `:3000`. `withEve()` proxies `/eve/v1/*` to a
local eve Nitro server on `:4274`, which it auto-starts from
`.output/server/index.mjs`. That file only exists after `eve build`.

The Docker image runs `eve build && next build` and copies `.output` into the
runtime image. If `.output` is missing, chat fails with
`ECONNREFUSED 127.0.0.1:4274`.

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
  NODE_ENV=production
```

Redeploy from GitHub / dflow after the `Dockerfile` is on `main`.

## If you must stay on herokuish

Increase curl patience and retry (still depends on reaching nodejs.org):

```bash
dokku config:set brain CURL_CONNECT_TIMEOUT=180 CURL_TIMEOUT=1200
```

Ensure a web process exists (`Procfile` starts Next via `node …/next start`).

Note: the repo uses **pnpm** (`pnpm-lock.yaml`). The Dockerfile installs with
`pnpm install --frozen-lockfile`, but the runtime CMD invokes Next with `node`
directly so Corepack does not need a writable home cache.

## Smoke check

```bash
dokku logs brain -t
curl -I https://<your-host>/
curl -sS https://<your-host>/eve/v1/health
```

Healthy chat needs both the Next ready line and a successful `/eve/v1/health`
(not `ECONNREFUSED 127.0.0.1:4274` in the logs).
