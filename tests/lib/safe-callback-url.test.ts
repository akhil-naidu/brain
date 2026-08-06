import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("allows same-origin relative paths", () => {
    expect(safeCallbackUrl("/chat")).toBe("/chat");
    expect(safeCallbackUrl("/schedules?tab=1")).toBe("/schedules?tab=1");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeCallbackUrl("https://evil.example/phish")).toBe("/chat");
    expect(safeCallbackUrl("//evil.example/phish")).toBe("/chat");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/chat");
    expect(safeCallbackUrl("chat")).toBe("/chat");
  });

  it("falls back for empty values", () => {
    expect(safeCallbackUrl(null)).toBe("/chat");
    expect(safeCallbackUrl(undefined, "/home")).toBe("/home");
  });
});
