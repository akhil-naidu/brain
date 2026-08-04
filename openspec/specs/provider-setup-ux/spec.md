# provider-setup-ux Specification

## Purpose
Keeps chat from failing opaquely when the model provider is not configured, while keeping operator env details out of the normal-user UI.
## Requirements
### Requirement: Setup status without exposing secrets
The system MUST expose a same-origin setup status that indicates whether `COMMAND_CODE_API_KEY` is configured. The response MUST NOT include the secret value.

#### Scenario: Missing key reported as not configured
- **WHEN** `COMMAND_CODE_API_KEY` is unset or blank
- **THEN** the setup status reports that the Command Code API key is not configured

#### Scenario: Present key reported as configured
- **WHEN** `COMMAND_CODE_API_KEY` is a non-empty value
- **THEN** the setup status reports that the Command Code API key is configured

### Requirement: Unavailable chat messaging for end users
When the Command Code API key is not configured, the chat UI MUST tell the user that chat is unavailable without naming env vars, `.env`, or provider product keys. Operator setup details remain in project docs such as `.env.example`. The composer MUST prevent sending turns until the key is configured.

#### Scenario: Empty chat shows unavailable guidance
- **WHEN** the chat UI loads and the setup status says the key is not configured
- **THEN** the empty state says chat is unavailable and that setup is incomplete

#### Scenario: Composer blocks send without key
- **WHEN** the key is not configured and the user focuses the composer
- **THEN** send is disabled with a short unavailable reason that does not name env vars

### Requirement: Friendly provider auth errors
When a turn fails with an error that indicates missing or invalid API credentials, the UI MUST show the same end-user unavailable guidance instead of only the raw provider text or operator env instructions.

#### Scenario: Auth-like failure is rewritten
- **WHEN** the agent reports an error mentioning an API key or unauthorized credential failure
- **THEN** the UI shows the end-user unavailable guidance rather than env-file instructions
