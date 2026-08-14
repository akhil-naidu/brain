import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeChatDemo } from "@/components/features/home-chat-demo";
import { HOME_CHAT_DEMO_TURNS } from "@/lib/features/catalog";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false;
        },
        onchange: null,
      }) satisfies MediaQueryList,
  );
});

describe("HomeChatDemo", () => {
  it("renders a multi-turn chat without video chrome", () => {
    render(<HomeChatDemo />);
    expect(document.querySelector("video")).toBeNull();
    expect(screen.queryByText(/not a recording/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    for (const turn of HOME_CHAT_DEMO_TURNS) {
      expect(screen.getByText(turn.user)).toBeTruthy();
      expect(screen.getByText(turn.assistant)).toBeTruthy();
      expect(screen.getByText(`${turn.tool.app} · ${turn.tool.action}`)).toBeTruthy();
    }
  });
});
