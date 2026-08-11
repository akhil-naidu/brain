## Context

See proposal.md — Why. Brain already uses Next.js App Router + `withEve()`, Tailwind 4, and public routes outside `app/(app)/` (e.g. `/features`). Authenticated surfaces live under `app/(app)/` and redirect anonymous users. Customer docs must remain public and ship inside the same Docker/Dokku image.

## Goals / Non-Goals

**Goals:**

- In-app Fumadocs at `/docs` composed safely with `withEve()`.
- MDX content tree under `content/docs/` with audience-oriented IA (Getting started, Self-hosting, Reference).
- P0 pages seeded from README + `docs/deploy-dokku.md` + `.env.example`.
- Discoverability: link from home/README.

**Non-Goals:**

- Mintlify / external docs host.
- Full connection catalog, SSO/SCIM, or enterprise hardening guides (later phases).
- Moving or deleting OpenSpec / superpowers trees.
- Docs authentication or workspace-gated content.

## Decisions

1. **Fumadocs in the Next app (not Mintlify)**  
   Rationale: $0, self-hosted with Brain, MDX portable later.  
   Alternative: Mintlify Hobby — deferred for cost/control.

2. **Route group `app/(docs)/docs/` outside `(app)`**  
   Rationale: avoid Better Auth redirect; keep docs out of `BrainAppShell`.  
   Alternative: middleware allowlist — unnecessary while `(app)` layout owns auth.

3. **Config composition: `withEve(withMDX(nextConfig))` (verify in tasks)**  
   Rationale: MDX transform wraps Next config; Eve proxy must remain outermost or verified equivalent so `/eve/v1/*` keeps working.  
   Alternative: separate docs app — rejected for single-deploy simplicity.

4. **Content at `content/docs/`**  
   Rationale: Fumadocs default; clear split from `docs/superpowers/` and `openspec/`.  
   Alternative: `docs/customer/` — more confusing next to engineering docs.

5. **P0 IA**  
   - Introduction  
   - Getting started: quickstart, first chat  
   - Self-hosting: overview (Docker + Dokku summary)  
   - Reference: environment variables  
   Later: connections/*, enterprise/*, playbooks journeys.

6. **Static-friendly docs layout**  
   Prefer static generation for docs pages where possible; do not force `dynamic = "force-dynamic"` from the app layout onto docs.

## Risks / Trade-offs

- **[Risk] `withMDX` + `withEve` composition breaks eve proxy** → Mitigation: smoke `/eve/v1` after config change; adjust wrap order if needed.
- **[Risk] Tailwind / Fumadocs UI theme clashes with Brain branding** → Mitigation: use Fumadocs default theme scoped to `(docs)` layout; light Brain header link only.
- **[Risk] Content drift from README / deploy-dokku** → Mitigation: P0 pages cite canonical ops facts; later add “see also” links, not duplicate forever.
- **[Trade-off] In-app docs vs polished SaaS docs** → Accept less polish for self-host alignment; MDX remains portable.

## Migration Plan

1. Add deps + MDX config + empty `/docs` shell.
2. Seed P0 MDX; link from home + README.
3. `pnpm verify` + manual `/docs` and chat smoke.
4. Rollback: remove `(docs)` routes and deps if needed; content stays in git.

## Open Questions

- Whether to enable Fumadocs search (Orama) in P0 or defer — defer to keep scope small unless install is trivial.
