## Purpose

Defines how the Brain eve agent runs locally and in production: model provider, HTTP channel auth posture, and infrastructure boundaries that keep the app self-hostable.
## Requirements
### Requirement: Command Code is the primary model path
The agent MUST use Command Code (or another direct/third-party provider configured in `agent/agent.ts`) as the primary model path. The system MUST NOT require Vercel AI Gateway credentials or gateway string model IDs for normal operation.

#### Scenario: Local turn uses Command Code
- **WHEN** an authenticated channel request starts a model turn with `COMMAND_CODE_API_KEY` configured
- **THEN** the agent invokes the configured Command Code chat model without calling Vercel AI Gateway

### Requirement: Eve HTTP channel is available
The system MUST expose the eve HTTP channel so authenticated clients can create sessions and stream turns on the agent's `/eve/v1/*` routes (including when mounted behind Next.js `withEve()`). Browser chat session create and turn traffic MUST require an authenticated Brain session and MUST NOT fall back to a shared anonymous principal.

#### Scenario: Session create is reachable for signed-in users
- **WHEN** a signed-in client POSTs to the eve session create route on the running app origin
- **THEN** the request is handled by the eve channel bound to that user’s principal (not rejected solely because Vercel OIDC is missing)

#### Scenario: Unauthenticated browser session create is rejected
- **WHEN** a client without a valid Brain session POSTs to the eve session create route used by the chat UI
- **THEN** the system rejects the request instead of authenticating as a shared anonymous user

### Requirement: Channel principal matches signed-in user
For Brain browser chat, the eve channel AuthFn MUST resolve `principalType` user and a stable `principalId` from the authenticated Brain session so MCP OAuth and approvals attach to that user. Token and approval lookup for workspace-scoped grants MUST use the session’s **active workspace** together with that principal.

#### Scenario: Turn uses session principal
- **WHEN** a signed-in user starts a chat turn that needs a connection token
- **THEN** the agent looks up tokens and approvals for that user’s principal id in the active workspace, not `anonymous` and not another workspace’s grants

#### Scenario: Workspace context on turn
- **WHEN** the signed-in user’s active workspace is W
- **THEN** MCP grant resolution for the turn uses workspace W

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

