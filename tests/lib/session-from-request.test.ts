import { describe, expect, it } from "vitest";
import { resolveBrainSessionAuthFromRequest } from "@/lib/auth/session-from-request";

describe("resolveBrainSessionAuthFromRequest", () => {
  it("accepts the internal operator bearer token", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions", {
        headers: { authorization: "Bearer internal-secret" },
      }),
      {
        BRAIN_INTERNAL_TOKEN: "internal-secret",
        BRAIN_OPERATOR_USER_ID: "operator-1",
      },
    );
    expect(auth).toMatchObject({
      principalId: "operator-1",
      principalType: "user",
      issuer: "brain",
      authenticator: "brain-session",
    });
  });

  it("rejects unauthenticated requests", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions"),
      {
        BRAIN_INTERNAL_TOKEN: "internal-secret",
        BRAIN_OPERATOR_USER_ID: "operator-1",
      },
    );
    expect(auth).toBeNull();
  });
});
