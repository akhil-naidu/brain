# sso-domain-verification Specification

## Purpose

Prove ownership of SSO email domains via DNS before those providers can authenticate users.

## Requirements

### Requirement: Unverified domains cannot SSO
When domain verification is enabled, Brain MUST reject SSO sign-in through a provider whose domain is not verified.

#### Scenario: Unverified provider blocked
- **WHEN** a visitor attempts company SSO for a domain whose provider is not verified
- **THEN** the sign-in fails until verification succeeds

### Requirement: Workspace admin verifies domain via DNS
A workspace owner or admin MUST be able to obtain a DNS TXT token for their workspace SSO provider and submit verification after publishing the record.

#### Scenario: Token issued
- **WHEN** an admin requests domain verification for their provider
- **THEN** the system returns a token and DNS host name to publish

#### Scenario: DNS verified
- **WHEN** the correct TXT record is present and an admin submits verify
- **THEN** the provider is marked domain-verified
