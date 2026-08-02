# Deploy Brain on Dokku / dflow

Brain is a Next.js + `withEve()` app. Prefer the **Dockerfile** builder so the
server never has to download Node from `nodejs.org` during build (herokuish
often fails with SSL timeouts on constrained hosts).

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

Ensure a web process exists (`Procfile` has `web: pnpm run start`).

Note: the repo uses **pnpm** (`pnpm-lock.yaml`). The Dockerfile enables Corepack
and installs with `pnpm install --frozen-lockfile`.

## Smoke check

```bash
dokku logs brain -t
curl -I https://<your-host>/
```
