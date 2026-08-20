import { describe, expect, it } from "vitest";
import { setupSecretPayload } from "@/lib/chat/connection-setup-secret";

describe("setupSecretPayload", () => {
  it("omits the secret when the field is not shown", () => {
    expect(
      setupSecretPayload({
        requiresClientSecret: false,
        clientSecret: "typed",
      }),
    ).toBeUndefined();
  });

  it("sends a required secret when non-empty", () => {
    expect(
      setupSecretPayload({
        requiresClientSecret: true,
        clientSecret: "  rb_key  ",
      }),
    ).toBe("rb_key");
  });

  it("omits an empty required secret so the server can keep the existing value", () => {
    expect(
      setupSecretPayload({
        requiresClientSecret: true,
        clientSecret: "   ",
      }),
    ).toBeUndefined();
  });

  it("sends an optional HTTP MCP bearer when typed", () => {
    expect(
      setupSecretPayload({
        requiresClientSecret: false,
        optionalClientSecret: true,
        clientSecret: "optional-token",
      }),
    ).toBe("optional-token");
  });
});
