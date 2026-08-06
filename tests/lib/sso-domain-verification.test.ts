import { describe, expect, it } from "vitest";
import {
  domainVerificationDnsHost,
  domainVerificationIdentifier,
} from "@/lib/auth/sso/domain-verification";

describe("sso domain verification helpers", () => {
  it("builds Better Auth compatible DNS identifier and host", () => {
    expect(domainVerificationIdentifier("acme-oidc")).toBe("_better-auth-token-acme-oidc");
    expect(domainVerificationDnsHost("acme-oidc", "acme.com")).toBe(
      "_better-auth-token-acme-oidc.acme.com",
    );
  });
});
