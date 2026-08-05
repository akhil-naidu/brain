## Approach

`resolvePublicOrigin(request)` priority:

1. `BRAIN_PUBLIC_URL` / `BRAIN_PUBLIC_ORIGIN`
2. Browser `Origin` / `Referer` (Menu Connect is a same-origin `fetch`)
3. `X-Forwarded-Host` + `X-Forwarded-Proto`, else `Host`
4. Internal `request.url` origin

Authorize route passes that origin into `menuConnectionCallbackUrl`.

## Non-goals

Eve mid-turn `CallbackBaseUrlKey` rewriting
