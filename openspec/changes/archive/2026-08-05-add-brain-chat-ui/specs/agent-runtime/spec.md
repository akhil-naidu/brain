## MODIFIED Requirements

### Requirement: Eve HTTP channel is available
The system MUST expose the eve HTTP channel so browser and other clients can create sessions and stream turns on `/eve/v1/*` (including when mounted behind Next.js `withEve()`). For the Brain chat UI, channel authentication MUST accept requests using a fixed anonymous principal with `principalType: "user"` without interactive login. This open principal is for local/trusted deployments only and MUST NOT depend on `vercelOidc()` or Sign in with Vercel.

#### Scenario: Session create is reachable
- **WHEN** a client POSTs to the eve session create route on the running app origin
- **THEN** the request is handled by the eve channel (not rejected solely because Vercel OIDC is missing)

#### Scenario: Browser chat without login
- **WHEN** the Brain chat UI creates a session from the browser with no login completed
- **THEN** the channel authenticates the caller as an anonymous user principal and allows the turn

#### Scenario: No Vercel OIDC required
- **WHEN** the channel auth policy is evaluated for the chat UI
- **THEN** authentication succeeds without `vercelOidc()` or Better Auth session cookies
