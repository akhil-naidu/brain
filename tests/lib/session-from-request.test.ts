import { describe, expect, it } from "vitest";
import { resolveBrainSessionAuthFromRequest } from "@/lib/auth/session-from-request";

const testEnv = {
  BRAIN_INTERNAL_TOKEN: "internal-secret",
  BRAIN_OPERATOR_USER_ID: "operator-1",
  BRAIN_DATABASE_URL:
    process.env["BRAIN_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    "postgres://brain:brain@127.0.0.1:5432/brain",
};

describe("resolveBrainSessionAuthFromRequest", () => {
  it("accepts the internal operator bearer token with workspace header", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions", {
        headers: {
          authorization: "Bearer internal-secret",
          "x-brain-workspace-id": "ws-1",
        },
      }),
      testEnv,
    );
    expect(auth).toMatchObject({
      principalId: "operator-1",
      principalType: "user",
      issuer: "brain:ws-1",
      authenticator: "brain-session",
    });
  });

  it("honors x-brain-run-as-user only with the internal bearer", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions", {
        headers: {
          authorization: "Bearer internal-secret",
          "x-brain-run-as-user": "user-42",
          "x-brain-workspace-id": "ws-9",
        },
      }),
      testEnv,
    );
    expect(auth?.principalId).toBe("user-42");
    expect(auth?.issuer).toBe("brain:ws-9");
  });

  it("rejects internal bearer without workspace", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions", {
        headers: { authorization: "Bearer internal-secret" },
      }),
      testEnv,
    );
    expect(auth).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const auth = await resolveBrainSessionAuthFromRequest(
      new Request("http://localhost/eve/v1/sessions"),
      testEnv,
    );
    expect(auth).toBeNull();
  });
});
