## ADDED Requirements

### Requirement: Docs describe Auto tool-result screening
Customer documentation MUST state that instance Auto and Strict screen tool *results* for prompt injection and secret-like leakage before the model sees them, that Dangerous skips that screening, that a match becomes a stub and never an approve prompt, and that command policy still blocks high-risk *calls* in every posture.

#### Scenario: Operator reads instance policies docs
- **WHEN** a visitor opens the instance policies documentation page
- **THEN** the page documents Auto/Strict result screening and that Dangerous skips it

#### Scenario: User reads approvals docs
- **WHEN** a visitor opens the approvals documentation page
- **THEN** the page distinguishes HITL (before execute), command-policy deny (no execute), and result screening (after execute, stub only)
