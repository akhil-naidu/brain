import { describe, expect, it } from "vitest";
import {
  decryptCustomModelApiKey,
  encryptCustomModelApiKey,
} from "@/lib/chat/custom-models/secret";

describe("custom model API key encryption", () => {
  const env = {
    BETTER_AUTH_SECRET: "test-only-better-auth-secret-32chars!!",
  };

  it("round-trips plaintext", () => {
    const ciphertext = encryptCustomModelApiKey("sk-test-key", env);
    expect(ciphertext.startsWith("v1.")).toBe(true);
    expect(ciphertext).not.toContain("sk-test-key");
    expect(decryptCustomModelApiKey(ciphertext, env)).toBe("sk-test-key");
  });

  it("fails closed without secret", () => {
    expect(() => encryptCustomModelApiKey("x", {})).toThrow(/BETTER_AUTH_SECRET/);
  });
});
