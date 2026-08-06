## MODIFIED Requirements

### Requirement: Eve HTTP channel is available
The system MUST expose the eve HTTP channel so authenticated clients can create sessions and stream turns on the agent's `/eve/v1/*` routes (including when mounted behind Next.js `withEve()`). Browser chat session create and turn traffic MUST require an authenticated Brain session and MUST NOT fall back to a shared anonymous principal.

#### Scenario: Session create is reachable for signed-in users
- **WHEN** a signed-in client POSTs to the eve session create route on the running app origin
- **THEN** the request is handled by the eve channel bound to that user’s principal (not rejected solely because Vercel OIDC is missing)

#### Scenario: Unauthenticated browser session create is rejected
- **WHEN** a client without a valid Brain session POSTs to the eve session create route used by the chat UI
- **THEN** the system rejects the request instead of authenticating as a shared anonymous user

## ADDED Requirements

### Requirement: Channel principal matches signed-in user
For Brain browser chat, the eve channel AuthFn MUST resolve `principalType` user and a stable `principalId` from the authenticated Brain session so MCP OAuth and approvals attach to that user.

#### Scenario: Turn uses session principal
- **WHEN** a signed-in user starts a chat turn that needs a connection token
- **THEN** the agent looks up tokens and approvals for that user’s principal id, not `anonymous`
