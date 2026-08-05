import { afterEach, describe, expect, it } from "vitest";
import {
  readConfiguredPublicOrigin,
  resolvePublicOrigin,
  type PublicOriginRequest,
} from "@/lib/http/public-origin";

afterEach(() => {
  delete process.env.BRAIN_PUBLIC_URL;
  delete process.env.BRAIN_PUBLIC_ORIGIN;
});

/** undici strips forbidden headers like Origin on `new Request`; stub the wire shape. */
function stubRequest(url: string, headers: Record<string, string> = {}): PublicOriginRequest {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    url,
    headers: {
      get(name: string) {
        return normalized[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe("readConfiguredPublicOrigin", () => {
  it("prefers BRAIN_PUBLIC_URL origin", () => {
    process.env.BRAIN_PUBLIC_URL = "https://brain.example.com/chat";
    expect(readConfiguredPublicOrigin()).toBe("https://brain.example.com");
  });
});

describe("resolvePublicOrigin", () => {
  it("uses BRAIN_PUBLIC_URL over request internals", () => {
    process.env.BRAIN_PUBLIC_URL = "https://brain.example.com";
    expect(
      resolvePublicOrigin(
        stubRequest("http://localhost:3000/api/connections/clickup/authorize", {
          origin: "http://localhost:3000",
        }),
      ),
    ).toBe("https://brain.example.com");
  });

  it("uses browser Origin when the internal request URL is localhost", () => {
    expect(
      resolvePublicOrigin(
        stubRequest("http://localhost:3000/api/connections/clickup/authorize", {
          origin: "https://brain.example.com",
        }),
      ),
    ).toBe("https://brain.example.com");
  });

  it("uses x-forwarded headers when Origin is absent", () => {
    expect(
      resolvePublicOrigin(
        stubRequest("http://localhost:3000/api/connections/clickup/authorize", {
          "x-forwarded-host": "brain.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://brain.example.com");
  });

  it("falls back to request.url origin", () => {
    expect(
      resolvePublicOrigin(stubRequest("http://localhost:3000/api/connections/clickup/authorize")),
    ).toBe("http://localhost:3000");
  });
});
