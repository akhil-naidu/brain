import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assistantTextForSlackMirror,
  formatSlackMirrorText,
  postSlackThreadMirror,
  SLACK_MIRROR_MAX_CHARS,
} from "@/lib/chat/slack-inbound/slack-mirror";

describe("formatSlackMirrorText", () => {
  it("labels user prompts as From Brain", () => {
    expect(formatSlackMirrorText("user", "  hello  ")).toBe("*From Brain*\n\nhello");
  });

  it("does not label assistant replies", () => {
    expect(formatSlackMirrorText("assistant", "world")).toBe("world");
  });

  it("returns null for empty text", () => {
    expect(formatSlackMirrorText("user", "  \n")).toBeNull();
    expect(formatSlackMirrorText("assistant", "")).toBeNull();
  });

  it("clips long text", () => {
    const text = "a".repeat(SLACK_MIRROR_MAX_CHARS + 10);
    const formatted = formatSlackMirrorText("assistant", text);
    expect(formatted?.endsWith("…")).toBe(true);
    expect(formatted?.length).toBe(SLACK_MIRROR_MAX_CHARS);
  });
});

describe("assistantTextForSlackMirror", () => {
  it("joins visible text parts and skips tools and reasoning", () => {
    expect(
      assistantTextForSlackMirror([
        { type: "reasoning", text: "secret" },
        { type: "text", text: "Hello" },
        { type: "dynamic-tool", text: "ignored" },
        { type: "text", text: "World" },
      ]),
    ).toBe("Hello\n\nWorld");
  });
});

describe("postSlackThreadMirror", () => {
  const mapping = { channelId: "C1", threadTs: "10.0" };

  it("returns 404 without a mapping and does not post", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    await expect(
      postSlackThreadMirror({
        botToken: "xoxb-test",
        mapping: null,
        role: "user",
        text: "hi",
        post,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Chat is not linked to a Slack thread.",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("returns 400 without a bot token and does not post", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    await expect(
      postSlackThreadMirror({
        botToken: null,
        mapping,
        role: "user",
        text: "hi",
        post,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Slack inbound is not configured.",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("posts thread_ts for a user prompt", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    await expect(
      postSlackThreadMirror({
        botToken: "xoxb-test",
        mapping,
        role: "user",
        text: "hi",
        post,
      }),
    ).resolves.toEqual({ ok: true, posted: true });
    expect(post).toHaveBeenCalledWith({
      channel: "C1",
      thread_ts: "10.0",
      text: "*From Brain*\n\nhi",
    });
  });

  it("skips empty assistant text", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    await expect(
      postSlackThreadMirror({
        botToken: "xoxb-test",
        mapping,
        role: "assistant",
        text: "  ",
        post,
      }),
    ).resolves.toEqual({ ok: true, posted: false });
    expect(post).not.toHaveBeenCalled();
  });

  it("maps Slack API failure to 502", async () => {
    await expect(
      postSlackThreadMirror({
        botToken: "xoxb-test",
        mapping,
        role: "assistant",
        text: "done",
        post: async () => ({ ok: false, error: "channel_not_found" }),
      }),
    ).resolves.toEqual({ ok: false, status: 502, error: "channel_not_found" });
  });
});

describe("slack-mirror module", () => {
  it("does not import the mention allowlist", async () => {
    const source = await readFile(
      path.join(process.cwd(), "lib/chat/slack-inbound/slack-mirror.ts"),
      "utf8",
    );
    expect(source).not.toMatch("channel-allowlist");
  });
});
