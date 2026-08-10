import { describe, expect, it } from "vitest";
import {
  mintSnowflakeProxyToken,
  verifySnowflakeProxyToken,
} from "@/agent/lib/snowflake-proxy-token";

describe("snowflake proxy token", () => {
  it("round-trips workspace id", () => {
    const env = { BETTER_AUTH_SECRET: "test-secret-value" };
    const token = mintSnowflakeProxyToken({ workspaceId: "ws_1" }, env, 1_000);
    expect(token).toBeTruthy();
    expect(verifySnowflakeProxyToken(token!, env, 1_500)).toEqual({ workspaceId: "ws_1" });
  });

  it("rejects expired or tampered tokens", () => {
    const env = { BETTER_AUTH_SECRET: "test-secret-value" };
    const token = mintSnowflakeProxyToken({ workspaceId: "ws_1" }, env, 1_000);
    expect(verifySnowflakeProxyToken(token!, env, 1_000 + 2 * 60 * 60 * 1000)).toBeNull();
    expect(verifySnowflakeProxyToken(`${token}x`, env, 1_500)).toBeNull();
  });
});
