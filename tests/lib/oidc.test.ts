import { describe, expect, it } from "vitest";
import { oidcCallbackPath, resolveOidcEnvConfig } from "@/lib/auth/oidc";

describe("resolveOidcEnvConfig", () => {
  it("returns null when credentials are incomplete", () => {
    expect(
      resolveOidcEnvConfig({
        BRAIN_OIDC_DISCOVERY_URL: "https://idp.example/.well-known/openid-configuration",
        BRAIN_OIDC_CLIENT_ID: "app",
      }),
    ).toBeNull();
  });

  it("builds discovery URL from issuer", () => {
    expect(
      resolveOidcEnvConfig({
        BRAIN_OIDC_ISSUER: "https://login.example.com/",
        BRAIN_OIDC_CLIENT_ID: "app",
        BRAIN_OIDC_CLIENT_SECRET: "secret",
      }),
    ).toEqual({
      providerId: "oidc",
      discoveryUrl: "https://login.example.com/.well-known/openid-configuration",
      clientId: "app",
      clientSecret: "secret",
      scopes: ["openid", "profile", "email"],
    });
  });

  it("honors explicit discovery URL, provider id, and scopes", () => {
    expect(
      resolveOidcEnvConfig({
        BRAIN_OIDC_DISCOVERY_URL: "https://idp.example/oidc/.well-known/openid-configuration",
        BRAIN_OIDC_CLIENT_ID: "app",
        BRAIN_OIDC_CLIENT_SECRET: "secret",
        BRAIN_OIDC_PROVIDER_ID: "okta",
        BRAIN_OIDC_SCOPES: "openid,email",
      }),
    ).toMatchObject({
      providerId: "okta",
      discoveryUrl: "https://idp.example/oidc/.well-known/openid-configuration",
      scopes: ["openid", "email"],
    });
    expect(oidcCallbackPath("okta")).toBe("/api/auth/oauth2/callback/okta");
  });
});
