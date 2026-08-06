export function oidcSsoCallbackPath(providerId: string): string {
  return `/api/auth/sso/callback/${providerId}`;
}

export function samlSsoCallbackPath(providerId: string): string {
  return `/api/auth/sso/saml2/callback/${providerId}`;
}
