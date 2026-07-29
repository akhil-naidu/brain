## Purpose

Defines how the Brain eve agent runs locally and in production: model provider, HTTP channel auth posture, and infrastructure boundaries that keep the app self-hostable.

## Requirements

### Requirement: Command Code is the primary model path
The agent MUST use Command Code (or another direct/third-party provider configured in `agent/agent.ts`) as the primary model path. The system MUST NOT require Vercel AI Gateway credentials or gateway string model IDs for normal operation.

#### Scenario: Local turn uses Command Code
- **WHEN** an authenticated channel request starts a model turn with `COMMAND_CODE_API_KEY` configured
- **THEN** the agent invokes the configured Command Code chat model without calling Vercel AI Gateway

### Requirement: Eve HTTP channel is available
The system MUST expose the eve HTTP channel so clients can create sessions and stream turns on the agent's `/eve/v1/*` routes (including when mounted behind Next.js `withEve()`).

#### Scenario: Session create is reachable
- **WHEN** a client POSTs to the eve session create route on the running app origin
- **THEN** the request is handled by the eve channel (not rejected solely because Vercel OIDC is missing)

### Requirement: No Vercel platform dependency for core runtime
Core agent runtime MUST remain operable without a Vercel account, Vercel project link, Vercel Connect, Vercel Sandbox, or Vercel OIDC authenticator.

#### Scenario: Local start without Vercel link
- **WHEN** a developer runs the agent or combined Next+eve dev server with only documented env vars (model + optional MCP OAuth clients)
- **THEN** the runtime starts without requiring `vercel link` or Vercel-hosted credentials

### Requirement: Sandbox stays non-Vercel
Code execution sandbox configuration MUST use local/Docker/microsandbox (or equivalent self-hosted backend), not Vercel Sandbox.

#### Scenario: Sandbox backend is self-hostable
- **WHEN** the agent is configured with a sandbox
- **THEN** the configured backend is microsandbox, Docker, local, or another non-Vercel sandbox
