# model-picker Specification

## Purpose
Lets Brain users choose among curated Command Code chat models from the chat UI so each turn can use a faster or stronger model without redeploying the agent.
## Requirements
### Requirement: Curated model catalog
The system MUST expose a curated allowlist of OpenAI-compatible Command Code chat model ids suitable for Brain’s chat-completions provider path. The catalog MUST include a default model that matches the agent fallback.

#### Scenario: Default model is available
- **WHEN** the chat UI loads the model catalog
- **THEN** it includes a default model id and at least one additional selectable model

### Requirement: Composer model picker
The chat UI MUST provide a control to select the active model from the curated catalog. The selection MUST persist across page reloads for that browser (local preference storage).

#### Scenario: Change model before send
- **WHEN** the user selects a different catalog model
- **THEN** the next sent turn includes that model id in turn client context

#### Scenario: Preference survives refresh
- **WHEN** the user selects a model and refreshes the page
- **THEN** the picker shows the previously selected model if it remains in the catalog

### Requirement: Agent honors selected model
The agent MUST resolve the turn’s selected catalog model id to the corresponding Command Code language model when valid. Invalid or missing ids MUST fall back to the configured default model without failing the turn.

#### Scenario: Valid selection switches model
- **WHEN** a turn’s client context contains a valid curated model id different from the default
- **THEN** the agent uses that model for model calls in the turn

#### Scenario: Unknown id falls back
- **WHEN** a turn’s client context contains an unknown model id
- **THEN** the agent uses the default fallback model and the turn still proceeds

