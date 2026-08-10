## ADDED Requirements

### Requirement: Merged model catalog
The system MUST expose a selectable model catalog for the active workspace that merges: (1) the curated Command Code allowlist when Command Code is considered available for selection, (2) all instance-scoped custom models, and (3) custom models scoped to the active workspace. Each entry MUST have a stable selectable id, display label, and enough metadata for the picker. Instance and workspace custom models MUST appear as distinct entries even when labels or provider model ids match. Catalog responses MUST NOT include custom model API keys.

#### Scenario: Workspace sees instance plus workspace models
- **WHEN** the chat UI loads the model catalog for an active workspace that has workspace custom models and the host has instance custom models
- **THEN** the catalog includes both sets as distinct selectable entries

#### Scenario: Other workspace models excluded
- **WHEN** the catalog is loaded for workspace A
- **THEN** it does not include custom models scoped only to workspace B

### Requirement: Custom model preference persistence
When the user selects a custom model that remains in the merged catalog, the composer selection MUST persist across page reloads for that browser using the same preference mechanism as curated models.

#### Scenario: Custom selection survives refresh
- **WHEN** the user selects a custom model id and refreshes the page
- **THEN** the picker shows that custom model if it remains in the merged catalog

## MODIFIED Requirements

### Requirement: Curated model catalog
The system MUST expose a curated allowlist of OpenAI-compatible Command Code chat model ids suitable for Brain’s chat-completions provider path. The catalog MUST include a default model that matches the agent fallback for Command Code. The curated allowlist MUST NOT include Anthropic Messages-only model ids (for example Claude), because those require a different provider endpoint than Brain’s Command Code chat path. The curated allowlist remains part of the merged catalog and is not the only source of selectable models when custom models exist.

#### Scenario: Default model is available
- **WHEN** the chat UI loads the model catalog and Command Code models are included
- **THEN** it includes a default curated model id and at least one additional selectable curated model

#### Scenario: Catalog stays on chat completions for curated entries
- **WHEN** the curated allowlist is loaded
- **THEN** every curated model id is intended for Command Code `/chat/completions` (not Anthropic `/messages` only)

### Requirement: Composer model picker
The chat UI MUST provide a control to select the active model from the merged catalog (curated plus visible custom models). The selection MUST persist across page reloads for that browser (local preference storage).

#### Scenario: Change model before send
- **WHEN** the user selects a different catalog model
- **THEN** the next sent turn includes that model id in turn client context

#### Scenario: Preference survives refresh
- **WHEN** the user selects a model and refreshes the page
- **THEN** the picker shows the previously selected model if it remains in the catalog

### Requirement: Agent honors selected model
The agent MUST resolve the turn’s selected model id to the corresponding language model when the id is a valid curated Command Code model or a custom model visible for the turn’s workspace. Invalid or missing ids MUST fall back without failing the turn: curated default when Command Code is configured; otherwise another available custom model when present.

#### Scenario: Valid curated selection switches model
- **WHEN** a turn’s client context contains a valid curated model id different from the default
- **THEN** the agent uses that Command Code model for model calls in the turn

#### Scenario: Valid custom selection switches model
- **WHEN** a turn’s client context contains a valid custom model id visible for the active workspace
- **THEN** the agent uses that custom model’s configured OpenAI-compatible endpoint for model calls in the turn

#### Scenario: Unknown id falls back
- **WHEN** a turn’s client context contains an unknown model id
- **THEN** the agent uses the fallback model rule and the turn still proceeds
