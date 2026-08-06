export type OidcEnvConfig = {
  readonly providerId: string;
  readonly discoveryUrl: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
};

function trim(value: string | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function discoveryUrlFromEnv(env: Record<string, string | undefined>): string | null {
  const explicit = trim(env["BRAIN_OIDC_DISCOVERY_URL"]);
  if (explicit) {
    return explicit;
  }
  const issuer = trim(env["BRAIN_OIDC_ISSUER"]);
  if (!issuer) {
    return null;
  }
  return `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`;
}

export function resolveOidcEnvConfig(
  env: Record<string, string | undefined> = process.env,
): OidcEnvConfig | null {
  const discoveryUrl = discoveryUrlFromEnv(env);
  const clientId = trim(env["BRAIN_OIDC_CLIENT_ID"]);
  const clientSecret = trim(env["BRAIN_OIDC_CLIENT_SECRET"]);
  if (!discoveryUrl || !clientId || !clientSecret) {
    return null;
  }
  const providerId = trim(env["BRAIN_OIDC_PROVIDER_ID"]) ?? "oidc";
  const scopesRaw = trim(env["BRAIN_OIDC_SCOPES"]);
  const scopes = scopesRaw
    ? scopesRaw.split(/[,\s]+/).filter(Boolean)
    : ["openid", "profile", "email"];
  return {
    providerId,
    discoveryUrl,
    clientId,
    clientSecret,
    scopes,
  };
}

export function oidcCallbackPath(providerId: string): string {
  return `/api/auth/oauth2/callback/${providerId}`;
}
