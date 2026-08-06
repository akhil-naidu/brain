# user-auth Specification

## Purpose

Provides self-hosted browser login sessions for Brain and binds chat, eve turns, and MCP OAuth to the signed-in user instead of a shared anonymous principal.

## Requirements

### Requirement: Signed-in browser session
The system MUST allow an operator or user to sign in to the Brain browser UI with a host-local account session backed by Better Auth. The system MUST NOT require Sign in with Vercel, Vercel OIDC, or Vercel Connect for this session.

#### Scenario: Successful sign-in
- **WHEN** a user submits valid credentials on the sign-in surface
- **THEN** the browser receives an authenticated session and can access chat and connection APIs as that user

#### Scenario: Failed sign-in
- **WHEN** a user submits invalid credentials
- **THEN** the system rejects the attempt without creating a session and does not expose other users’ data

### Requirement: Sign-out ends the session
The system MUST provide a way to sign out that clears the browser session so subsequent protected requests are unauthenticated.

#### Scenario: Sign-out
- **WHEN** a signed-in user signs out
- **THEN** chat history and connection APIs treat the caller as unauthenticated until they sign in again

### Requirement: Unauthenticated access is denied for protected surfaces
Chat history APIs, eve browser chat sessions, and connection authorize/status/disconnect endpoints MUST require an authenticated session. Unauthenticated callers MUST NOT act as a shared anonymous chat principal.

#### Scenario: Unauthenticated chat list
- **WHEN** a client without a valid session requests the chats collection
- **THEN** the system rejects the request (unauthorized or equivalent) and does not return another user’s chats

#### Scenario: Unauthenticated eve session create
- **WHEN** a client without a valid session attempts to create an eve chat session for the Brain UI
- **THEN** the system rejects the request instead of binding it to a shared anonymous user

### Requirement: Bootstrap initial account
A fresh Brain host with no users MUST provide a bootstrap path to create the first operator account without open public self-signup for arbitrary strangers.

#### Scenario: First operator creation
- **WHEN** the host has zero user accounts and an authorized bootstrap action creates the first account
- **THEN** that account can sign in and use Brain, and open public registration remains unavailable by default

### Requirement: Session maps to eve user principal
Each authenticated Brain session MUST map to a stable eve user principal (`principalType` user with a stable user id) used for MCP OAuth token storage and agent authorization.

#### Scenario: Principal is stable across reloads
- **WHEN** the same user signs in again after a reload
- **THEN** MCP connection tokens and per-user chat records continue to resolve to that same principal id
