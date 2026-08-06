## Why

Workspace invites are link-only today. When an admin binds an email, Brain should optionally deliver that invite over SMTP so recipients do not rely on chat paste alone—still self-hostable, no Vercel email.

## What Changes

- SMTP mailer configured via env (`BRAIN_SMTP_*` / `BRAIN_EMAIL_FROM`)
- Creating an invite with an email attempts delivery of the invite URL
- API/UI report whether the email was sent; invite still succeeds if SMTP is unset (copy-link fallback)
- Document env vars in `.env.example`

## Capabilities

### New Capabilities

- `invite-email-delivery`: SMTP invite email send + status reporting

### Modified Capabilities

- `workspace-invites`: Create-with-email MAY trigger outbound mail
- `auth-workspace-ui`: Workspace settings shows email sent / not configured status

## Impact

- `nodemailer` dependency
- `lib/auth/email/*`, invites POST route, workspace settings UI
