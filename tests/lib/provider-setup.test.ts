import { describe, expect, it } from "vitest";
import {
  formatProviderErrorMessage,
  isCommandCodeApiKeyConfigured,
  looksLikeProviderAuthError,
  MISSING_COMMAND_CODE_API_KEY_MESSAGE,
} from "@/lib/chat/provider-setup";

describe("provider setup helpers", () => {
  it("detects configured and blank API keys", () => {
    expect(isCommandCodeApiKeyConfigured({ COMMAND_CODE_API_KEY: "sk-test" })).toBe(true);
    expect(isCommandCodeApiKeyConfigured({ COMMAND_CODE_API_KEY: "  " })).toBe(false);
    expect(isCommandCodeApiKeyConfigured({})).toBe(false);
  });

  it("rewrites auth-like provider errors", () => {
    expect(looksLikeProviderAuthError("Incorrect API key provided")).toBe(true);
    expect(looksLikeProviderAuthError("401 Unauthorized")).toBe(true);
    expect(looksLikeProviderAuthError("Model overloaded")).toBe(false);
    expect(formatProviderErrorMessage("invalid_api_key from upstream")).toBe(
      MISSING_COMMAND_CODE_API_KEY_MESSAGE,
    );
    expect(formatProviderErrorMessage("Model overloaded")).toBe("Model overloaded");
  });
});
