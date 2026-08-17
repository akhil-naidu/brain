## Purpose

Provides a public in-app customer documentation site for Brain end users, self-host operators, and enterprise admins, shipped with the same self-hosted application.

## Requirements

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

### Requirement: Docs describe agent safety posture and command policy
Customer documentation MUST describe the instance agent safety posture (`strict` / `auto` / `dangerous`), who can change it, that Auto is the default, that Ask and Plan constraints still apply, and that a command policy blocks high-risk shell and destructive SQL in every posture including Dangerous.

#### Scenario: Operator reads instance policies docs
- **WHEN** a visitor opens the instance policies documentation page
- **THEN** the page documents the agent safety posture control on `/settings/instance`

#### Scenario: User reads approvals docs
- **WHEN** a visitor opens the approvals documentation page
- **THEN** the page explains that HITL pauses depend on instance posture and that command-policy denials never become an approve prompt

### Requirement: Docs describe Auto tool-result screening
Customer documentation MUST state that instance Auto and Strict screen tool *results* for prompt injection and secret-like leakage before the model sees them, that Dangerous skips that screening, that a match becomes a stub and never an approve prompt, and that command policy still blocks high-risk *calls* in every posture.

#### Scenario: Operator reads instance policies docs
- **WHEN** a visitor opens the instance policies documentation page
- **THEN** the page documents Auto/Strict result screening and that Dangerous skips it

#### Scenario: User reads approvals docs
- **WHEN** a visitor opens the approvals documentation page
- **THEN** the page distinguishes HITL (before execute), command-policy deny (no execute), and result screening (after execute, stub only)
