# Brain Chat UI — Design Spec

Date: 2026-07-29  
Status: approved — implementation via ordered plans in `docs/superpowers/plans/`  
Source inspiration: [vercel-labs/eve-chat-template](https://github.com/vercel-labs/eve-chat-template)

## Goal

Give Brain a browser chat UI that feels like the eve chat template, branded as Brain, so users drive the agent from the UI instead of the agent terminal. No auth and no durable data storage for v1. Stay self-hostable and free of Vercel platform dependencies.

## Decisions

| Topic | Choice |
| --- | --- |
| Delivery strategy | Clone template UI into this repo, then strip auth/DB/Vercel pieces in place |
| Repo layout | Next.js app in the same repo as `agent/` (`withEve()`) |
| Branding | Template chrome + Brain name; teal/navy; geometric straight-line brain logo |
| Connections | Keep composer integrations menu; wire ClickUp / Slack / Asana / Gmail MCP OAuth |
| Auth | None for chat routes |
| Persistence | None — browser session via `useEveAgent` only |

## Architecture

```text
browser (Next.js UI)
  └─ useEveAgent() ── same-origin ──► /eve/v1/*
                                           │
                                           ▼
                                    agent/ (existing)
                                      ├─ model (Command Code)
                                      ├─ channels/eve.ts (open auth)
                                      └─ connections (MCP OAuth)
```

- Add Next.js (`app/`, `components/`, `lib/` chat helpers as needed) beside existing `agent/`.
- Wrap config with `withEve()` so one `dev` command serves UI + agent.
- Do **not** require `vercel link`, Neon, Upstash, Better Auth, Vercel Connect, or AI Gateway.
- Keep current agent model, sandbox, instructions, and MCP OAuth connection implementations.

### Channel auth

- Chat must work without login (no Better Auth / OAuth login gate).
- Prefer a fixed anonymous `user` principal AuthFn (no credentials) so MCP connection OAuth keeps working; do not rely on `none()` alone if that blocks user-scoped connections.
- Do not add `vercelOidc()` or Sign in with Vercel.
- Document that this open principal is for local/trusted use only.

## UI & branding

### Layout (template-like)

- Sidebar + main conversation + bottom composer.
- Message list with Streamdown markdown, reasoning, tool calls/results, HITL prompts.
- Composer: text input, send/stop, connections menu.
- “New chat” resets the local eve session (`reset()`).
- No sign-in button, auth modal, or user menu.

### Brand

- Product name: **Brain**.
- Logo: geometric/tech brain mark built from **multiple straight line segments** (angular / circuit-like), not a soft organic brain. SVG for favicon, app icon, and sidebar mark.
- Colors: deep teal / navy primary on neutral surfaces. Avoid purple-gradient and cream-serif default AI looks.

### Sidebar without storage

- Keep sidebar chrome for visual parity with the template.
- History is ephemeral: current in-tab session only (or empty + current). Refresh clears chat.
- No `/api/chats` persistence, no Neon-backed titles, no delete-from-DB.

## Strip scope

### Remove / never wire

- Better Auth + Sign in with Vercel + `app/auth/*` + auth components
- Neon / Drizzle / migrations / chat DB queries
- Upstash Redis rate limiting
- Template Vercel Connect connections (Notion, Linear, Sentry) and Connect-backed Slack channel
- Deploy-with-Vercel button assumptions, `.vercelignore` as a required path
- Vercel AI Gateway string models as the primary path

### Keep / adapt

- Chat shell, conversation, composer, markdown, tool/HITL UI patterns from the template
- Existing `agent/` Command Code model and MCP OAuth stack
- Env vars already documented in `.env.example` (`COMMAND_CODE_API_KEY`, Slack/Asana/Gmail client credentials; ClickUp DCR)

### Package / scripts

- Add Next.js, Tailwind, shadcn-style UI deps as required by the chat UI.
- `dev` should run the combined Next + eve experience (via `withEve`).
- Prefer adapting the template’s UI code rather than reinventing message/tool rendering.

## Runtime flow

1. User opens `/` → empty Brain chat shell.
2. `useEveAgent()` opens a same-origin eve session.
3. User sends a message → stream updates messages, tools, reasoning in the UI.
4. Connection authorize prompts and the integrations menu drive MCP OAuth in the browser (ClickUp, Slack, Asana, Gmail).
5. “New chat” calls `reset()`; no database write.
6. Refresh starts a fresh ephemeral session.

## Error handling

- Surface `useEveAgent` `status === "error"` and `error` in the conversation/composer area (template-style).
- Connection OAuth failures remain visible via connection authorization UI / existing authorize URL logging behavior; no silent swallow.
- Missing `COMMAND_CODE_API_KEY` should fail clearly when a turn is attempted.

## Testing / acceptance

- `dev` serves the Brain UI without auth prompts.
- Sending a message streams an assistant reply in the UI (no terminal required).
- New chat clears the conversation.
- Refresh does not restore prior messages (no storage).
- Connections menu lists ClickUp, Slack, Asana, Gmail; authorize flow can start from the UI.
- No new dependency on Vercel account, Neon, Upstash, or Vercel Connect to run locally.
- Branding shows “Brain” and the straight-line brain mark.

## Out of scope (v1)

- Durable chat history / multi-device resume
- Multi-user authentication and authorization
- Rate limiting
- File uploads / blob storage
- Pixel-perfect fork of every template deploy script
- Production hardening of open (`none`) auth for public internet exposure

## Risks

- Template code assumes persisted chats and auth; stripping must not leave broken API imports.
- Open channel auth is fine for local/trusted use only; document that before any public deploy.
- `withEve` docs emphasize Vercel deploy paths; local/self-host path must remain primary per repo policy.
