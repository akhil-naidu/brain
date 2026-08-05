## Why

Dark-mode users could see a light first paint before React applied the system theme.

## What Changes

- CSS media-query dark tokens on `:root:not(.light)` before any theme class exists
- Blocking bootstrap script sets `.dark` / `.light` + `color-scheme` before paint
- Shared `lib/theme/bootstrap` helpers used by layout + `ThemeProvider`

## Non-goals

- Manual theme picker / persisted user override
- Vercel infra, auth, or chat persistence changes
