import { describe, expect, it } from "vitest";
import { connectionStatusLabel, getSafeAuthorizeUrl } from "@/lib/chat/connections-status-api";

describe("connectionStatusLabel", () => {
  it("maps statuses to user-facing labels", () => {
    expect(connectionStatusLabel("connected")).toBe("Connected");
    expect(connectionStatusLabel("needs_sign_in")).toBe("Sign in");
    expect(connectionStatusLabel("needs_setup")).toBe("Needs setup");
  });
});

describe("getSafeAuthorizeUrl", () => {
  it("allows http(s) URLs only", () => {
    expect(getSafeAuthorizeUrl("https://example.test/oauth")).toBe("https://example.test/oauth");
    expect(getSafeAuthorizeUrl("http://localhost:3000/x")).toBe("http://localhost:3000/x");
    expect(getSafeAuthorizeUrl("ftp://example.test/oauth")).toBeNull();
    expect(getSafeAuthorizeUrl("not-a-url")).toBeNull();
  });
});
