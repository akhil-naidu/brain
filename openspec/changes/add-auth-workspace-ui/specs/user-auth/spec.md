## ADDED Requirements

### Requirement: Sign-up page when open
When instance signup mode is `open`, Brain MUST expose a browser sign-up flow that creates an email/password user via Better Auth (not Vercel auth). When mode is `invite-only`, public sign-up without an invite MUST remain unavailable.

#### Scenario: Open signup from UI
- **WHEN** signup mode is `open` and a visitor completes the sign-up form
- **THEN** a user account is created and they can access the authenticated app

### Requirement: Invite path creates users under invite-only
When signup mode is `invite-only`, Brain MUST still allow account creation through a valid workspace invite registration path.

#### Scenario: Invite register under invite-only
- **WHEN** a visitor uses a valid invite registration path with email and password
- **THEN** the account is created despite invite-only public signup being disabled
