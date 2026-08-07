import { afterEach, describe, expect, it } from "vitest";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

describe("seo site helpers", () => {
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
