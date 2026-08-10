## ADDED Requirements

### Requirement: Discovery-assisted provider model id
When an admin can manage custom models, the Models create/edit UI MUST offer a control to fetch discovered model ids for the entered base URL (and optional API key) and let the admin select a candidate into the provider model id field. Manual entry of provider model id MUST remain available when discovery fails or returns no candidates.

#### Scenario: Fetch fills candidates
- **WHEN** an authorized admin enters a base URL and activates Fetch models
- **AND** discovery returns candidate ids
- **THEN** the UI presents those candidates for selection into the provider model id field

#### Scenario: Manual entry still works
- **WHEN** discovery fails or returns an empty list
- **THEN** the admin can still type a provider model id and save the custom model
