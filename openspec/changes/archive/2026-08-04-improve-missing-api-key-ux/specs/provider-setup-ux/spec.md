## Purpose

Helps local operators configure Command Code by surfacing a clear missing-API-key message in the Brain chat UI instead of opaque provider failures.

## ADDED Requirements

### Requirement: Setup status without exposing secrets
The system MUST expose a same-origin setup status that indicates whether `COMMAND_CODE_API_KEY` is configured. The response MUST NOT include the secret value.

#### Scenario: Missing key reported as not configured
- **WHEN** `COMMAND_CODE_API_KEY` is unset or blank
- **THEN** the setup status reports that the Command Code API key is not configured

#### Scenario: Present key reported as configured
- **WHEN** `COMMAND_CODE_API_KEY` is a non-empty value
- **THEN** the setup status reports that the Command Code API key is configured

### Requirement: Proactive missing-key guidance in chat UI
When the Command Code API key is not configured, the chat UI MUST show setup guidance that names `COMMAND_CODE_API_KEY` and points operators to `.env` / `.env.example`. The composer MUST prevent sending turns until the key is configured, with a clear disabled reason.

#### Scenario: Empty chat shows setup guidance
- **WHEN** the chat UI loads and the setup status says the key is not configured
- **THEN** the empty state includes instructions to set `COMMAND_CODE_API_KEY`

#### Scenario: Composer blocks send without key
- **WHEN** the key is not configured and the user focuses the composer
- **THEN** send is disabled with a reason that mentions the missing API key

### Requirement: Friendly provider auth errors
When a turn fails with an error that indicates missing or invalid API credentials, the UI MUST show the same clear Command Code setup guidance instead of only the raw provider text.

#### Scenario: Auth-like failure is rewritten
- **WHEN** the agent reports an error mentioning an API key or unauthorized credential failure
- **THEN** the UI shows guidance to set `COMMAND_CODE_API_KEY` in `.env`
