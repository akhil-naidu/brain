import { describe, expect, it } from "vitest";
import { assertValidEmailDomains, domainMatches, parseEmailDomains } from "@/lib/auth/sso/domains";
import { oidcSsoCallbackPath, samlSsoCallbackPath } from "@/lib/auth/sso/paths";

describe("sso domains", () => {
  it("parses and validates domain lists", () => {
    expect(parseEmailDomains("Acme.com, acme.co\nfoo.io")).toEqual([
      "acme.com",
      "acme.co",
      "foo.io",
    ]);
    expect(() => assertValidEmailDomains(["not a domain"])).toThrow(/invalid/i);
    expect(domainMatches("acme.com", "acme.com,other.io")).toBe(true);
    expect(domainMatches("nope.com", "acme.com")).toBe(false);
  });

  it("builds Better Auth SSO callback paths", () => {
    expect(oidcSsoCallbackPath("acme")).toBe("/api/auth/sso/callback/acme");
    expect(samlSsoCallbackPath("acme")).toBe("/api/auth/sso/saml2/callback/acme");
  });
});
