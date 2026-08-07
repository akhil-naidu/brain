# mcp-tools-catalog Specification

## Purpose

Lets signed-in users inspect which MCP tools are loaded for their active workspace after connections are authorized, without starting a chat turn—similar to browsing available tools in Cursor.

## Requirements

### Requirement: Loaded MCP tools catalog API
The host MUST expose a session-authenticated API that returns the MCP tools available to the signed-in user in the **active workspace** for connections that are connected (usable grant present). Each tool entry MUST include at least a stable tool name, optional description, and the owning connection id/display name. The API MUST NOT require Neon, Vercel Connect, or Vercel OIDC.

#### Scenario: Connected connection lists tools
- **WHEN** the signed-in user has a usable grant for a connection in the active workspace and requests the tools catalog
- **THEN** the response includes that connection’s MCP tools with name and owning connection

#### Scenario: Disconnected connection omitted
- **WHEN** a connection is not connected for the signed-in user in the active workspace
- **THEN** the catalog does not list tools for that connection as available

#### Scenario: Workspace isolation
- **WHEN** the user is connected in workspace A and switches active workspace to B without a grant in B
- **THEN** the catalog for B does not include tools that were only available via the A grant

#### Scenario: Unauthenticated request rejected
- **WHEN** a client without a valid session requests the tools catalog
- **THEN** the system rejects the request and does not return another user’s tools

### Requirement: Catalog visible on Tools page
The `/tools` surface MUST show the loaded MCP tools catalog for the active workspace, grouped or labeled by connection, including empty and error states.

#### Scenario: User opens Tools after Connect
- **WHEN** the user has at least one connected MCP app and opens `/tools`
- **THEN** they can see the loaded tool names (and descriptions when available) for those connections

#### Scenario: No connected apps
- **WHEN** the user has no connected MCP apps
- **THEN** the Tools page shows an empty catalog state that explains connecting an app first

#### Scenario: Catalog refresh after connect
- **WHEN** the user completes Connect for an MCP app and returns to `/tools`
- **THEN** the catalog updates to include that connection’s tools without requiring a chat turn

### Requirement: Catalog does not replace in-chat tool calls
Showing the catalog MUST NOT remove or replace the existing rendering of tool calls inside chat messages when the agent invokes tools.

#### Scenario: Agent still shows tool rows in chat
- **WHEN** the agent calls an MCP tool during a turn
- **THEN** the chat UI still shows the tool call affordance in the message stream as before
