## ADDED Requirements

### Requirement: Composer connections menu for MCP providers
The chat UI MUST provide a composer-level connections menu listing ClickUp, Slack, Asana, and Gmail. Each entry MUST be toggleable per browser session. The menu MUST NOT require Vercel Connect connector UIDs.

#### Scenario: Menu lists Brain MCP providers
- **WHEN** the user opens the connections menu
- **THEN** they see ClickUp, Slack, Asana, and Gmail (not Notion/Linear/Sentry Connect placeholders)

#### Scenario: Toggle updates enabled state
- **WHEN** the user toggles a connection off
- **THEN** the UI reflects the disabled state immediately

### Requirement: Per-turn connection client context
When sending a chat turn, the UI MUST include client context describing which connections are enabled and disabled so the agent can prefer enabled MCP tools.

#### Scenario: Disabled connection reflected in context
- **WHEN** the user disables Slack and sends a message
- **THEN** the turn's client context indicates Slack is disabled for that turn

### Requirement: Connection authorization continues in the UI
When a connection requires interactive OAuth authorization during a turn, the chat UI MUST surface the authorization affordance so the user can continue without relying solely on the agent terminal.

#### Scenario: Authorize prompt visible in chat
- **WHEN** a turn requests connection authorization
- **THEN** the chat UI shows a control or link to complete authorization
