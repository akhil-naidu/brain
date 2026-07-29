## Context

Brain today is agent-only (`eve dev`). The approved design (`docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`) chooses clone-then-strip of eve-chat-template UI into this repo, Next.js + `withEve()`, no auth, no storage. Ordered implementation gates already exist in `docs/superpowers/plans/2026-07-30-01` … `07`. OpenSpec captures the behavior contract; those plans remain the step-by-step execution source.

## Goals / Non-Goals

**Goals:**
- Same-origin Brain chat UI that streams agent replies without the terminal
- Template-like chrome (sidebar + composer + messages) with Brain branding
- Connections menu wired to existing MCP OAuth providers
- Self-hostable; no Vercel infra for core path

**Non-Goals:**
- Durable multi-device chat history
- Multi-user login
- Rate limiting / Redis
- File uploads
- Pixel-perfect retention of template deploy scripts

## Decisions

1. **Next.js in-repo + `withEve()`** — matches template integration model and same-origin `/eve/v1/*`.
2. **Thin `useEveAgent` bridge** — do not port persistence halves of template `agent-chat.tsx`; port presentation components then strip.
3. **Anonymous `user` principal** — open AuthFn returning `principalType: "user"` so user-scoped MCP OAuth works without Better Auth.
4. **Keep superpowers plans** — Plans 01–07 are the verifiable implementation sequence; OpenSpec tasks defer to them.
5. **Template mirror outside git** — `/Users/dev/github/tmp/eve-chat-template` for reference (see `.cursor/rules/eve-chat-template-reference.mdc`).

## Risks / Trade-offs

- Open anonymous auth is unsafe on the public internet — document local/trusted only.
- Template stripping can leave broken auth/DB imports — Plan 07 hygiene gate required.
- Sidebar without persistence is decorative for history — acceptable for v1 parity.
