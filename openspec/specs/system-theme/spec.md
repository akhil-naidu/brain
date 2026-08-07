# system-theme Specification

## Purpose

Applies the user’s system color preference on first paint so dark mode does not flash light theme before hydration.

## Requirements

### Requirement: System dark theme without first-paint flash

The app MUST present system dark preference colors on the first paint without waiting for React hydration. A blocking bootstrap MAY set the document theme class for class-based dark utilities, and CSS MUST also provide dark tokens via `prefers-color-scheme` when no explicit `.light` class is present.

#### Scenario: Dark-preference reload

- **WHEN** the user reloads Brain with `prefers-color-scheme: dark`
- **THEN** the first painted background/foreground use dark theme tokens
- **AND** the document theme class matches dark for `dark:` utilities after bootstrap
