## ADDED Requirements

### Requirement: Create invite reports email delivery status
When creating an invite with a bound email, the create response MUST include whether an invite email was sent (and a short reason when not).

#### Scenario: Status fields present
- **WHEN** an admin creates an invite with an email
- **THEN** the response includes `emailSent` boolean information for the UI
