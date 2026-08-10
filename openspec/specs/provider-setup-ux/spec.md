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

### Requirement: Setup status includes custom-model availability
The same-origin setup status MUST indicate whether the active workspace has at least one usable custom model (instance or workspace scope) in addition to whether `COMMAND_CODE_API_KEY` is configured. The response MUST NOT include secret values.

#### Scenario: Custom models reported when present
- **WHEN** the active workspace catalog includes at least one custom model
- **THEN** the setup status reports that custom models are available for chat

#### Scenario: No custom models reported when absent
- **WHEN** the active workspace has no instance or workspace custom models
- **THEN** the setup status reports that custom models are not available

### Requirement: Unavailable chat messaging for end users
Chat MUST be treated as unavailable for sending only when neither Command Code nor a usable custom model is available for the active workspace. When `COMMAND_CODE_API_KEY` is not configured and no usable custom model exists, the chat UI MUST tell the user that chat is unavailable without naming env vars, `.env`, or provider product keys. Operator setup details remain in project docs such as `.env.example`. The composer MUST prevent sending turns until at least one of Command Code or a usable custom model is available. When a usable custom model exists, the composer MUST allow sending even if Command Code is not configured, and curated Command Code entries MAY be omitted or disabled in the picker until Command Code is configured.

#### Scenario: Empty chat shows unavailable guidance when nothing is configured
- **WHEN** the chat UI loads and setup status says Command Code is not configured and custom models are not available
- **THEN** the empty state says chat is unavailable and that setup is incomplete

#### Scenario: Composer blocks send when nothing is configured
- **WHEN** neither Command Code nor a usable custom model is available and the user focuses the composer
- **THEN** send is disabled with a short unavailable reason that does not name env vars

#### Scenario: Custom-only host can chat
- **WHEN** Command Code is not configured and at least one usable custom model is available for the active workspace
- **THEN** the composer allows sending turns that use an available custom model

### Requirement: Friendly provider auth errors
When a turn fails with an error that indicates missing or invalid API credentials for the selected provider path, the UI MUST show end-user unavailable or credential-failure guidance instead of only the raw provider text or operator env instructions. Guidance MUST NOT name env vars or `.env` paths.

#### Scenario: Auth-like failure is rewritten
- **WHEN** the agent reports an error mentioning an API key or unauthorized credential failure
- **THEN** the UI shows end-user guidance rather than env-file instructions
