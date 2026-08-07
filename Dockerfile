# Prefer Dokku's Dockerfile builder over herokuish so Node comes from
# the base image instead of a live download from nodejs.org.
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Optional: bake the account MCP URL into the eve bundle at build time.
# Runtime Set up still works via scripts/patch-snowflake-bundled-url.mjs.
ARG SNOWFLAKE_MCP_URL
ENV SNOWFLAKE_MCP_URL=$SNOWFLAKE_MCP_URL
RUN node scripts/write-snowflake-compiled-url-from-env.mjs
# eve build writes .output/server/index.mjs (proxied at :4274 by withEve).
RUN pnpm run build

# Runtime image: no Corepack/pnpm — start eve + Next via scripts/start-production.mjs.
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV EVE_NEXT_PRODUCTION_PORT=4274
ENV HOME=/home/nextjs

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs \
  && mkdir -p /app/.eve \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/.output ./.output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/agent ./agent
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Entrypoint runs as root so a Dokku/dflow volume mounted at /app/.eve can be
# chown'd to nextjs, then drops privileges before starting the app.
USER root
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "scripts/start-production.mjs"]
