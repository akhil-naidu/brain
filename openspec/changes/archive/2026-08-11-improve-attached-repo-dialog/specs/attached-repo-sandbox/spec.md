## Purpose

Improve attach-repo UX with a dialog, synced URL/fields, and GitHub connection guidance for private repos.

## ADDED Requirements

### Requirement: Attach repository dialog
The system MUST open an Attach repository dialog from the composer repo control. The dialog MUST accept a GitHub URL or `owner/repo` (with optional branch in the URL or `@ref`) and MUST also expose separate Owner, Repo, and Branch fields that stay synchronized with the paste input. The user MUST be able to clear the attachment from the dialog.

#### Scenario: Paste URL with tree branch
- **WHEN** the user pastes `https://github.com/acme/api/tree/feat/x` and attaches
- **THEN** the chat attachment is `acme/api` with ref `feat/x`

#### Scenario: Edit separate fields
- **WHEN** the user sets Owner `acme`, Repo `api`, Branch `main` and attaches
- **THEN** the chat attachment is `acme/api@main`

#### Scenario: Clear from dialog
- **WHEN** a repo is attached and the user clears it in the dialog
- **THEN** the chat no longer has an attached repo

### Requirement: GitHub status for private repos
When the attach dialog is open, the system SHOULD show whether GitHub is connected and MUST guide the user to Tools to connect GitHub for private repository clones. Public repository attach MUST remain available when GitHub is not connected.

#### Scenario: GitHub not connected
- **WHEN** the dialog opens and GitHub status is not connected
- **THEN** the dialog shows guidance to connect GitHub in Tools for private repos

#### Scenario: GitHub connected
- **WHEN** the dialog opens and GitHub is connected
- **THEN** the dialog indicates private repos are available via the connected GitHub account
