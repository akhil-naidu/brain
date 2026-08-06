import { describe, expect, it } from "vitest";
import { requireInternalBearer } from "@/lib/auth/require-internal-token";
import {
  internalBrainOrigin,
  internalScheduleFetchHeaders,
} from "@/lib/chat/internal-brain-origin";

describe("requireInternalBearer", () => {
  it("rejects when BRAIN_INTERNAL_TOKEN is unset", () => {
    const result = requireInternalBearer(new Request("http://localhost/api/briefs/run"), {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("rejects missing or wrong bearer", () => {
    const env = { BRAIN_INTERNAL_TOKEN: "correct-secret" };
    const missing = requireInternalBearer(new Request("http://localhost/api/briefs/run"), env);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.response.status).toBe(401);
    }

    const wrong = requireInternalBearer(
      new Request("http://localhost/api/briefs/run", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
      env,
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) {
      expect(wrong.response.status).toBe(401);
    }
  });

  it("accepts a matching bearer token", () => {
    const env = { BRAIN_INTERNAL_TOKEN: "correct-secret" };
    const result = requireInternalBearer(
      new Request("http://localhost/api/playbook-schedules/run", {
        headers: { authorization: "Bearer correct-secret" },
      }),
      env,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("internalScheduleFetchHeaders", () => {
  it("returns null without a token and builds Authorization when set", () => {
    expect(internalScheduleFetchHeaders({})).toBeNull();
    expect(internalScheduleFetchHeaders({ BRAIN_INTERNAL_TOKEN: "abc" })).toEqual({
      "content-type": "application/json",
      authorization: "Bearer abc",
    });
  });

  it("defaults Next origin to loopback 3000", () => {
    expect(internalBrainOrigin({})).toBe("http://127.0.0.1:3000");
    expect(internalBrainOrigin({ BRAIN_INTERNAL_URL: "http://localhost:3001/" })).toBe(
      "http://localhost:3001",
    );
  });
});
