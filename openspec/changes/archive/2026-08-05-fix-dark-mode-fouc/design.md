## Approach

Brain theming is system-preference only and still needs a `.dark` class for Tailwind `dark:` variants.

1. CSS `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }` paints correct CSS variables with no JS
2. Inline bootstrap script (via `dangerouslySetInnerHTML`) adds `.dark`/`.light` before first paint so utilities match
3. `ThemeProvider` reuses the same apply/resolve helpers and listens for preference changes

## Non-goals

Stored theme preference UI, per-route themes
