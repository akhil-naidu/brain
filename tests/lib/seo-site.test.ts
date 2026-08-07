import { afterEach, describe, expect, it } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import { absoluteUrl, getSiteUrl, SITE_STAGE, SITE_VERSION } from "@/lib/seo/site";

describe("seo site helpers", () => {
  it("exposes the public product stage", () => {
    expect(SITE_STAGE).toBe("Beta");
  });

  it("keeps SITE_VERSION aligned with package.json", () => {
    expect(SITE_VERSION).toBe(packageJson.version);
    expect(SITE_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  const previousPublicUrl = process.env["BRAIN_PUBLIC_URL"];
  const previousPublicOrigin = process.env["BRAIN_PUBLIC_ORIGIN"];

  afterEach(() => {
    if (previousPublicUrl === undefined) {
      delete process.env["BRAIN_PUBLIC_URL"];
    } else {
      process.env["BRAIN_PUBLIC_URL"] = previousPublicUrl;
    }
    if (previousPublicOrigin === undefined) {
      delete process.env["BRAIN_PUBLIC_ORIGIN"];
    } else {
      process.env["BRAIN_PUBLIC_ORIGIN"] = previousPublicOrigin;
    }
  });

  it("uses BRAIN_PUBLIC_URL when set", () => {
    process.env["BRAIN_PUBLIC_URL"] = "https://brain.example.com/chat";
    delete process.env["BRAIN_PUBLIC_ORIGIN"];
    expect(getSiteUrl().origin).toBe("https://brain.example.com");
    expect(absoluteUrl("/")).toBe("https://brain.example.com");
    expect(absoluteUrl("/sign-in")).toBe("https://brain.example.com/sign-in");
  });

  it("falls back to localhost when unset", () => {
    delete process.env["BRAIN_PUBLIC_URL"];
    delete process.env["BRAIN_PUBLIC_ORIGIN"];
    expect(getSiteUrl().origin).toBe("http://localhost:3000");
  });
});
