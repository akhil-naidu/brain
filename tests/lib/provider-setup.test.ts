import { describe, expect, it } from "vitest";
import {
  formatProviderError,
  formatProviderErrorMessage,
  isCommandCodeApiKeyConfigured,
  looksLikeProviderAuthError,
  MISSING_COMMAND_CODE_API_KEY_MESSAGE,
  PROVIDER_CREDENTIAL_FAILURE_MESSAGE,
  PROVIDER_CREDENTIAL_FAILURE_TITLE,
  sanitizeProviderErrorMessage,
} from "@/lib/chat/provider-setup";

describe("provider setup helpers", () => {
  it("detects configured and blank API keys", () => {
    expect(isCommandCodeApiKeyConfigured({ COMMAND_CODE_API_KEY: "sk-test" })).toBe(true);
    expect(isCommandCodeApiKeyConfigured({ COMMAND_CODE_API_KEY: "  " })).toBe(false);
    expect(isCommandCodeApiKeyConfigured({})).toBe(false);
  });

  it("rewrites auth-like turn errors as model credential failures", () => {
    expect(looksLikeProviderAuthError("Incorrect API key provided")).toBe(true);
    expect(looksLikeProviderAuthError("401 Unauthorized")).toBe(true);
    expect(looksLikeProviderAuthError("could not load an API key")).toBe(true);
    expect(looksLikeProviderAuthError("Model overloaded")).toBe(false);

    const auth = formatProviderError("Model provider API key missing");
    expect(auth).toEqual({
      title: PROVIDER_CREDENTIAL_FAILURE_TITLE,
      message: PROVIDER_CREDENTIAL_FAILURE_MESSAGE,
    });
    expect(auth.message).not.toBe(MISSING_COMMAND_CODE_API_KEY_MESSAGE);
    expect(formatProviderErrorMessage("invalid_api_key from upstream")).toBe(
      PROVIDER_CREDENTIAL_FAILURE_MESSAGE,
    );
    expect(formatProviderError("Model overloaded")).toEqual({
      title: "Request failed",
      message: "Model overloaded",
    });
  });

  it("hides operator env hints from non-auth errors", () => {
    expect(sanitizeProviderErrorMessage("Set COMMAND_CODE_API_KEY in .env")).toBe(
      "Something went wrong with this request.",
    );
  });

  it("keeps the host unavailable copy when already using that message", () => {
    expect(formatProviderError(MISSING_COMMAND_CODE_API_KEY_MESSAGE)).toEqual({
      title: "Chat isn't available",
      message: MISSING_COMMAND_CODE_API_KEY_MESSAGE,
    });
  });
});
