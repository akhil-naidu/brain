import { describe, expect, it } from "vitest";
import { resolveEveHttpHost } from "@/lib/chat/eve-http-host";

describe("resolveEveHttpHost", () => {
  it("prefers EVE_BASE_URL", () => {
    expect(
      resolveEveHttpHost({
        EVE_BASE_URL: "http://127.0.0.1:9999/",
        NODE_ENV: "development",
      }),
    ).toBe("http://127.0.0.1:9999");
  });

  it("uses production Nitro port by default", () => {
    expect(
      resolveEveHttpHost({
        NODE_ENV: "production",
        EVE_NEXT_PRODUCTION_PORT: "4274",
      }),
    ).toBe("http://127.0.0.1:4274");
  });

  it("uses Next PORT in development", () => {
    expect(
      resolveEveHttpHost({
        NODE_ENV: "development",
        PORT: "3001",
      }),
    ).toBe("http://127.0.0.1:3001");
  });
});
