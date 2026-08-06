# invite-email-delivery Specification

## Purpose
Deliver workspace invite links by email when SMTP is configured on the host.

## Requirements

### Requirement: Send invite email when SMTP configured
When a workspace admin creates an invite that includes a bound email address and the host has SMTP configured, Brain MUST attempt to send an email containing the invite URL to that address.

#### Scenario: Email sent
- **WHEN** SMTP is configured and an admin creates an invite for `user@example.com`
- **THEN** the system attempts delivery and reports that the email was sent

### Requirement: Invite succeeds without SMTP
When SMTP is not configured, creating an invite with an email MUST still succeed and MUST report that email was not sent so the admin can copy the link.

#### Scenario: SMTP missing
- **WHEN** SMTP is not configured and an admin creates an invite with an email
- **THEN** the invite is created and the response indicates email was not sent due to missing mail config
