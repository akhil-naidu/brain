## Purpose

Lets Brain attach a GitHub repository to a chat and clone it into the Agent microsandbox so harness tools can work on a real checkout, with dialog UX for URL/fields and GitHub connection guidance for private repos.

## Requirements

### Requirement: Attach a GitHub repo to chat
The system MUST allow the user to attach a GitHub repository to the active chat by `owner/repo` or `https://github.com/owner/repo` URL, with an optional branch or tag ref. The attachment MUST be sent in turn client context for subsequent Agent turns. Clearing the attachment MUST stop cloning on new sessions.

#### Scenario: Attach by owner/repo
- **WHEN** the user attaches `acme/api` with no ref
- **THEN** turn client context includes a repo identifier for `acme/api` (default branch)

#### Scenario: Clear attachment
- **WHEN** the user clears the attached repo
- **THEN** later turns omit the repo from client context

### Requirement: Clone attached repo into Agent sandbox
When Agent mode starts a sandbox session and a repo is attached, the system MUST shallow-clone that repository into `/workspace` once per durable sandbox session. Ask mode MUST NOT require a clone. The system MUST NOT use Vercel Sandbox.

#### Scenario: Agent session clones attached repo
- **WHEN** an Agent turn runs with an attached repo and a new sandbox session starts
- **THEN** `/workspace` contains the cloned repository contents for harness tools

#### Scenario: Ask mode ignores clone requirement
- **WHEN** the chat is in Ask mode with a repo attached
- **THEN** harness tools remain omitted and no sandbox clone is required for Ask turns

### Requirement: Prefer local checkout when attached
When a repo is attached, Agent instructions MUST tell the model to prefer harness tools under `/workspace` for code changes and to use GitHub MCP for remote PR/issue operations. Those instructions MUST also include an explicit coding playbook: explore the checkout with read/search/shell tools, make focused edits with write tools, run available verification commands when reasonable, and summarize what changed. Instructions MUST NOT claim IDE features (open editors, language servers, inline apply).

#### Scenario: Agent guidance mentions attached repo
- **WHEN** a turn includes an attached repo in client context
- **THEN** dynamic Agent instructions reference working in the sandbox checkout

#### Scenario: Agent guidance includes coding playbook
- **WHEN** a turn includes an attached repo in client context and the turn is Agent mode
- **THEN** dynamic Agent instructions include explore, edit, verify, and summarize guidance plus GitHub MCP reserved for remote operations

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
