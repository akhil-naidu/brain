## Context

Invites already support optional email binding and shareable URLs. Delivery was deferred.

## Decisions

1. **SMTP via nodemailer** — self-hostable; `BRAIN_SMTP_URL` (smtp://…) or host/port/user/pass; `BRAIN_EMAIL_FROM` required to send.
2. **Best-effort on create** — invite row is always created; when email is present and SMTP is configured, send; on send failure return invite with `emailSent: false` and error message (HTTP still 201).
3. **No SMTP = no send** — `emailSent: false`, `emailSkippedReason: "smtp-not-configured"`; UI keeps copy link.
4. **No Resend/Vercel/SendGrid SDKs** as required path (operators can point SMTP at those if they want).

## Out of scope

- Magic-link passwordless login emails
- Retry queues / bounce handling
- Custom email HTML templates beyond a simple text+basic HTML body
