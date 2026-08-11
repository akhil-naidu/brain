## 1. Dependencies and Next config

- [x] 1.1 Add Fumadocs packages (`fumadocs-mdx`, `fumadocs-core`, `fumadocs-ui`) via pnpm
- [x] 1.2 Add `source.config.ts`, `postinstall`/`fumadocs-mdx` script, and compose `createMDX` with `withEve` in `next.config.ts`
- [x] 1.3 Add docs source loader (`lib/docs/source.ts` or equivalent) and TypeScript path wiring for generated `.source`

## 2. Docs app routes

- [x] 2.1 Create public `app/(docs)/docs` layout with Fumadocs UI (sidebar/nav), outside authenticated `(app)` shell
- [x] 2.2 Add `/docs` index and `[[...slug]]` page routes that render MDX from `content/docs`
- [x] 2.3 Confirm unauthenticated `/docs` does not redirect to sign-in

## 3. P0 customer content

- [x] 3.1 Add `content/docs` meta/nav and introduction page
- [x] 3.2 Add getting-started pages: local quickstart + first chat
- [x] 3.3 Add self-hosting overview (Docker + Dokku) and environment variables reference (no OpenSpec/superpowers pages)

## 4. Discoverability and verify

- [x] 4.1 Link to `/docs` from home/marketing surface and README
- [x] 4.2 Run `pnpm verify` and smoke that docs routes typecheck/build with eve config composition intact

## 5. Full pin-to-pin coverage

- [x] 5.1 Expand IA: Chat, Connections, Workspaces, Playbooks & schedules, Models, Enterprise, Reference
- [x] 5.2 Document chat surfaces (modes, composer, attachments, approvals, history/projects, attached repo)
- [x] 5.3 Document all MCP connections (DCR, static OAuth, PAT, HTTP)
- [x] 5.4 Document workspaces, playbooks/schedules/morning brief, models/tools, enterprise SSO/SCIM/license
- [x] 5.5 Deepen self-hosting (Docker, Dokku, upgrades, troubleshooting) and reference (env, shortcuts, glossary)
