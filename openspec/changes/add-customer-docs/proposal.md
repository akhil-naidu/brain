## Why

Brain has engineering docs (OpenSpec, superpowers plans, README, Dokku guide) but no customer-facing documentation site for end users, self-host operators, or enterprise admins. Customers need in-product `/docs` that ships with the same self-hosted deploy — not a paid SaaS docs host.

## What Changes

- Add an in-app **Fumadocs** documentation site at `/docs` (public, no sign-in).
- Seed **P0 customer content**: introduction, local quickstart, first chat, self-host overview (Docker / Dokku), environment reference.
- Keep OpenSpec and `docs/superpowers/` as engineering-only; do not surface them in the customer site.
- Link to `/docs` from the marketing/home surface and README (short pointer).
- **Non-goals:** Mintlify or other hosted docs SaaS; rewriting OpenSpec; documenting every MCP connection or enterprise SSO/SCIM in this change (those are follow-on content phases); Vercel-hosted docs infra.

## Capabilities

### New Capabilities

- `customer-docs`: Public in-app documentation site (Fumadocs) for Brain end users, self-host operators, and enterprise admins, with MDX content and navigation.

### Modified Capabilities

- (none)

## Impact

- New deps: `fumadocs-mdx`, `fumadocs-core`, `fumadocs-ui` (and related).
- `next.config.ts`: compose `createMDX()` with existing `withEve()`.
- New routes under `app/(docs)/docs/`; content under `content/docs/`.
- `package.json` postinstall / scripts for `fumadocs-mdx` source generation.
- README pointer to `/docs`; no change to auth, chat persistence, or model providers.
