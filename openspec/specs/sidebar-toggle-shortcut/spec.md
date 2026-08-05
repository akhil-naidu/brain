# sidebar-toggle-shortcut Specification

## Purpose

Lets users expand or collapse the app sidebar with a keyboard shortcut.

## Requirements

### Requirement: Sidebar toggle keyboard shortcut

The app UI MUST toggle the sidebar between expanded and compact modes when the user presses Command-B or Control-B, using the same state as the sidebar toggle control. Compact mode MUST keep a narrow icon rail visible instead of removing the sidebar entirely.

#### Scenario: Shortcut collapses an expanded sidebar

- **WHEN** the sidebar is expanded and the user presses the toggle shortcut
- **THEN** the sidebar becomes compact

#### Scenario: Shortcut expands a compact sidebar

- **WHEN** the sidebar is compact and the user presses the toggle shortcut
- **THEN** the sidebar expands

### Requirement: Shortcut discoverability

The expand/collapse sidebar controls MUST expose the shortcut so users can discover it.

#### Scenario: Sidebar controls mention the shortcut

- **WHEN** the user inspects an expand or collapse sidebar control
- **THEN** the shortcut is indicated
