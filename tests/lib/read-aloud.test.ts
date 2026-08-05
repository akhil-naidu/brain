import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canUseSpeechSynthesis, speakText } from "@/lib/chat/read-aloud";

type MockUtterance = {
  text: string;
  addEventListener: ReturnType<typeof vi.fn>;
};

describe("canUseSpeechSynthesis", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when speech APIs are unavailable", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    expect(canUseSpeechSynthesis()).toBe(false);
  });

  it("returns true when speech APIs are present", () => {
    vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: vi.fn() });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class MockSpeechSynthesisUtterance {
        text = "";
        addEventListener = vi.fn();
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    expect(canUseSpeechSynthesis()).toBe(true);
  });
});

describe("speakText", () => {
  let cancel: ReturnType<typeof vi.fn>;
  let speak: ReturnType<typeof vi.fn>;
  let utterances: MockUtterance[];

  beforeEach(() => {
    cancel = vi.fn();
    speak = vi.fn();
    utterances = [];

    vi.stubGlobal("speechSynthesis", { cancel, speak });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class MockSpeechSynthesisUtterance {
        text: string;
        addEventListener = vi.fn();
        constructor(text: string) {
          this.text = text;
          utterances.push(this);
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when speech APIs are unavailable", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    expect(speakText("hello")).toBeNull();
  });

  it("returns null for empty or whitespace-only text", () => {
    expect(speakText("")).toBeNull();
    expect(speakText("   \n\t  ")).toBeNull();
    expect(cancel).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });

  it("cancels ongoing speech before speaking trimmed text", () => {
    const handle = speakText("  hello world  ");
    expect(handle).not.toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(utterances).toHaveLength(1);
    expect(utterances[0]?.text).toBe("hello world");
  });

  it("cancels again when starting a new utterance", () => {
    speakText("first");
    speakText("second");
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(utterances[1]?.text).toBe("second");
  });

  it("wires onEnd and onError callbacks", () => {
    const onEnd = vi.fn();
    const onError = vi.fn();
    speakText("hi", { onEnd, onError });
    expect(utterances[0]?.addEventListener).toHaveBeenCalledWith("end", onEnd, { once: true });
    expect(utterances[0]?.addEventListener).toHaveBeenCalledWith("error", onError, {
      once: true,
    });
  });

  it("stop cancels speech and is safe to call multiple times", () => {
    const handle = speakText("hello");
    expect(handle).not.toBeNull();
    cancel.mockClear();
    handle!.stop();
    handle!.stop();
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
