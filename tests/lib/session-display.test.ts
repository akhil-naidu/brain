import { describe, expect, it } from "vitest";
import { describeUserAgent, isAuthSessionRow, unwrapSessionList } from "@/lib/auth/session-display";

describe("describeUserAgent", () => {
  it("summarizes common desktop agents", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");
  });

  it("falls back when missing", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
  });
});

describe("unwrapSessionList", () => {
  it("accepts bare arrays and { data } wrappers", () => {
    const row = {
      token: "abc",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-02-01T00:00:00.000Z",
    };
    expect(isAuthSessionRow(row)).toBe(true);
    expect(unwrapSessionList([row])).toHaveLength(1);
    expect(unwrapSessionList({ data: [row] })).toHaveLength(1);
    expect(unwrapSessionList(null)).toHaveLength(0);
  });
});
