## ADDED Requirements

### Requirement: Mobile history is reachable

On viewports below the desktop sidebar breakpoint, the chat shell MUST present history in an overlay/drawer when the sidebar is open, and MUST close that overlay after selecting a chat or starting a new chat from the drawer.

#### Scenario: Open history on a phone

- **WHEN** the user opens the sidebar control on a narrow viewport
- **THEN** chat history appears in a dismissible overlay
- **AND** choosing a chat or New chat closes the overlay
