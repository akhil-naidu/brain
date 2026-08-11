## Purpose

Lets Brain attach a GitHub repository to a chat and clone it into the Agent microsandbox so harness tools can work on a real checkout.

## ADDED Requirements

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
When a repo is attached, Agent instructions MUST tell the model to prefer harness tools under `/workspace` for code changes and to use GitHub MCP for remote PR/issue operations.

#### Scenario: Agent guidance mentions attached repo
- **WHEN** a turn includes an attached repo in client context
- **THEN** dynamic Agent instructions reference working in the sandbox checkout
