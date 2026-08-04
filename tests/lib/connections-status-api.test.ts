import { describe, expect, it } from "vitest";
import { connectionStatusLabel } from "@/lib/chat/connections-status-api";

describe("connectionStatusLabel", () => {
  it("maps statuses to user-facing labels", () => {
    expect(connectionStatusLabel("connected")).toBe("Connected");
    expect(connectionStatusLabel("needs_sign_in")).toBe("Sign in when asked");
    expect(connectionStatusLabel("needs_setup")).toBe("Needs setup");
  });
});
