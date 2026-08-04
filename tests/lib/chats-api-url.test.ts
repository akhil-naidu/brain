import { describe, expect, it } from "vitest";
import { chatUrl } from "@/lib/chat/chats-api";

describe("chatUrl", () => {
  it("points chat routes at /chat", () => {
    expect(chatUrl(null)).toBe("/chat");
    expect(chatUrl("abc")).toBe("/chat?chat=abc");
  });
});
