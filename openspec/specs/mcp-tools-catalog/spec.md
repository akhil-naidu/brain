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

### Requirement: Catalog visible on Tools page and in the chat Tools menu
The `/tools` surface MUST show loaded MCP tool names **under each connected app card** (not a separate page-wide “Loaded tools” section), including loading, empty, and error states. The chat Tools (integrations) menu MUST offer a compact tools icon on each **connected** app row (before the enable toggle); activating that control MUST reveal tools in a separate popover/panel — not as an inline expansion under the row.

#### Scenario: User opens Tools after Connect
- **WHEN** the user has at least one connected MCP app and opens `/tools`
- **THEN** they can see the loaded tool names for each connected app on that app’s card (descriptions MAY appear as hover/title text)

#### Scenario: Connected chat row offers a tools control before the toggle
- **WHEN** the user opens the chat Tools menu and a connection is connected
- **THEN** that row shows a tools icon before the enable toggle, and does not list tool names inline in the row

#### Scenario: Reveal tools in a separate panel from chat
- **WHEN** the user activates the tools control on a connected app row in the chat Tools menu
- **THEN** they can see the loaded tool names in a separate popover/panel (descriptions MAY appear as hover/title text)

#### Scenario: Disconnected apps hide tools control in chat
- **WHEN** a connection is not connected
- **THEN** the chat Tools menu does not offer the tools control for that row

#### Scenario: Catalog refresh after connect
- **WHEN** the user completes Connect for an MCP app and returns to `/tools` or later opens the chat Tools menu
- **THEN** that app’s tools are available without requiring a chat turn

### Requirement: Catalog does not replace in-chat tool calls
Showing the catalog MUST NOT remove or replace the existing rendering of tool calls inside chat messages when the agent invokes tools.

#### Scenario: Agent still shows tool rows in chat
- **WHEN** the agent calls an MCP tool during a turn
- **THEN** the chat UI still shows the tool call affordance in the message stream as before
