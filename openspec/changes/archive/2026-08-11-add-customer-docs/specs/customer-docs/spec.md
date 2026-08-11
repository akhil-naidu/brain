## Purpose

Provides a public in-app customer documentation site for Brain end users, self-host operators, and enterprise admins, shipped with the same self-hosted application.

## ADDED Requirements

### Requirement: Public documentation site at /docs

The system SHALL serve customer documentation at `/docs` without requiring a signed-in session.

#### Scenario: Anonymous visitor opens docs

- **WHEN** an unauthenticated user navigates to `/docs` (or a nested docs path)
- **THEN** the documentation page loads successfully without redirecting to sign-in or setup

#### Scenario: Signed-in user opens docs

- **WHEN** a signed-in user navigates to `/docs`
- **THEN** the documentation page loads successfully outside the authenticated app shell

### Requirement: Documentation navigation and content

The documentation site SHALL expose a navigable table of contents covering at least introduction, getting started (local quickstart and first chat), self-hosting overview, and environment variable reference.

#### Scenario: Visitor browses getting started

- **WHEN** a visitor opens the getting-started section from docs navigation
- **THEN** they can reach pages for local quickstart and first chat

#### Scenario: Operator browses self-hosting and env reference

- **WHEN** an operator opens the self-hosting or environment reference pages
- **THEN** the pages describe deploying Brain with operator-provided Postgres and required environment variables without requiring Vercel-hosted services

### Requirement: Engineering docs remain separate

The customer documentation site MUST NOT present OpenSpec specs or `docs/superpowers/` implementation plans as customer-facing documentation pages.

#### Scenario: Customer docs index does not list engineering plans

- **WHEN** a visitor views the customer docs navigation
- **THEN** OpenSpec change folders and superpowers plan checklists are not listed as docs pages
