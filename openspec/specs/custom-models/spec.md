# custom-models Specification

## Purpose
Lets instance admins and workspace admins register OpenAI-compatible custom chat models (Ollama, LM Studio, company proxies, etc.) at instance or workspace scope, manage them on a dedicated Models page, and have those models available for chat without redeploying Brain.

## Requirements

### Requirement: Instance-scoped custom models
An instance admin MUST be able to create, update, and delete custom chat models scoped to the Brain instance. Instance-scoped models MUST be available in the model catalog of every workspace. Non-instance-admins MUST NOT mutate instance-scoped models.

#### Scenario: Instance admin creates host model
- **WHEN** an instance admin creates a custom model with a label, OpenAI-compatible base URL, provider model id, and optional API key
- **THEN** the model is stored as instance-scoped and appears in every workspace’s selectable catalog

#### Scenario: Non-admin cannot mutate instance models
- **WHEN** a signed-in user who is not an instance admin attempts to create, update, or delete an instance-scoped custom model
- **THEN** the system rejects the request

### Requirement: Workspace-scoped custom models
A workspace owner or admin MUST be able to create, update, and delete custom chat models scoped to the active workspace. Workspace-scoped models MUST be available only to members of that workspace. Members who are not owners or admins MUST NOT mutate workspace-scoped models. Clearing or deleting a workspace model MUST NOT affect instance models or other workspaces’ models.

#### Scenario: Workspace admin creates workspace model
- **WHEN** a workspace owner or admin creates a custom model for the active workspace
- **THEN** the model is stored for that workspace and appears in that workspace’s selectable catalog

#### Scenario: Other workspace cannot see it
- **WHEN** a member switches to a different workspace that does not define the same workspace model
- **THEN** that workspace-scoped model is absent from the catalog

#### Scenario: Member cannot mutate workspace models
- **WHEN** a workspace member who is not an owner or admin attempts to create, update, or delete a workspace-scoped custom model
- **THEN** the system rejects the request

### Requirement: OpenAI-compatible custom model fields
Each custom model MUST store at least: a stable internal id, display label, OpenAI-compatible base URL, provider model id used against that base URL, optional API key, optional description, and a positive context-window token count used for agent compaction. v1 MUST support OpenAI-compatible chat-completions endpoints only (not Anthropic Messages-only providers).

#### Scenario: Required fields enforced
- **WHEN** a create or update request omits label, base URL, or provider model id
- **THEN** the system rejects the request with a validation error

#### Scenario: Optional API key allowed
- **WHEN** an admin creates a model for a local OpenAI-compatible server that does not require auth
- **THEN** the model is stored without an API key and remains usable

### Requirement: Models management page
The system MUST provide a dedicated Models page where authorized admins can list and manage custom models for the scopes they control. The page MUST show instance models to instance admins and workspace models for the active workspace to workspace owners/admins. Ordinary members MUST be able to view which models are available but MUST NOT see mutation controls or secret values.

#### Scenario: Instance admin manages host models on the page
- **WHEN** an instance admin opens the Models page
- **THEN** they can add, edit, and delete instance-scoped models

#### Scenario: Workspace admin manages workspace models on the page
- **WHEN** a workspace owner or admin opens the Models page
- **THEN** they can add, edit, and delete models for the active workspace

#### Scenario: Member sees read-only availability
- **WHEN** a workspace member who cannot manage models opens the Models page
- **THEN** they can see available models for the active workspace without edit or delete actions

### Requirement: Discovery-assisted provider model id
When an admin can manage custom models, the Models create/edit UI MUST offer a control to fetch discovered model ids for the entered base URL (and optional API key) and let the admin select a candidate into the provider model id field. Manual entry of provider model id MUST remain available when discovery fails or returns no candidates.

#### Scenario: Fetch fills candidates
- **WHEN** an authorized admin enters a base URL and activates Fetch models
- **AND** discovery returns candidate ids
- **THEN** the UI presents those candidates for selection into the provider model id field

#### Scenario: Manual entry still works
- **WHEN** discovery fails or returns an empty list
- **THEN** the admin can still type a provider model id and save the custom model

### Requirement: API keys never leave the server
Custom model API keys MUST be stored server-side only. List and detail API responses MUST NOT include the raw API key value. Responses MAY indicate whether a key is configured. Updating a model without submitting a new key MUST leave the existing key unchanged.

#### Scenario: List redacts secrets
- **WHEN** any authorized client lists custom models
- **THEN** the response does not include API key plaintext

#### Scenario: Blank key on update keeps previous
- **WHEN** an admin updates a model’s label and omits a new API key
- **THEN** the previously stored key remains in effect

### Requirement: Agent resolves custom models
When a turn’s selected model id refers to a custom model visible in the active workspace catalog (instance or that workspace), the agent MUST use an OpenAI-compatible chat-completions client pointed at that model’s base URL, API key (if any), and provider model id, with the stored context window. Invalid, deleted, or out-of-scope custom ids MUST fall back without failing the turn: prefer the curated default when Command Code is configured; otherwise prefer another available custom model for that workspace when present.

#### Scenario: Custom selection used for the turn
- **WHEN** a turn’s client context contains a valid custom model id for the active workspace
- **THEN** the agent calls that model’s configured OpenAI-compatible endpoint with the configured provider model id

#### Scenario: Deleted custom id falls back
- **WHEN** a turn’s client context contains a custom model id that no longer exists or is not visible to the active workspace
- **THEN** the agent falls back per the fallback rule and the turn still proceeds
