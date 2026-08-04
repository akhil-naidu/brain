import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatSidebar } from "@/components/chat/sidebar";
import type { ChatSummary } from "@/lib/chat/store/types";

afterEach(cleanup);

const chats: readonly ChatSummary[] = [
  {
    id: "chat-1",
    title: "First chat",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
  },
  {
    id: "chat-2",
    title: "ClickUp planning",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
  },
];

function renderSidebar(overrides?: {
  readonly onRenameChat?: (chatId: string, title: string) => void;
  readonly chats?: readonly ChatSummary[];
}) {
  return render(
    <ChatSidebar
      activeChatId="chat-1"
      brand={<span>Brain</span>}
      chats={overrides?.chats ?? chats}
      currentTitle="First chat"
      onDeleteChat={vi.fn()}
      onNewChat={vi.fn()}
      onRenameChat={overrides?.onRenameChat ?? vi.fn()}
      onSelectChat={vi.fn()}
    />,
  );
}

describe("ChatSidebar rename", () => {
  it("renames a chat through onRenameChat", async () => {
    const onRenameChat = vi.fn();
    renderSidebar({ onRenameChat });

    fireEvent.click(screen.getByRole("button", { name: "Rename First chat" }));
    const input = screen.getByRole("textbox", { name: "Rename First chat" });
    fireEvent.change(input, { target: { value: "Renamed chat" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameChat).toHaveBeenCalledWith("chat-1", "Renamed chat");
  });

  it("cancels rename on Escape without calling onRenameChat", () => {
    const onRenameChat = vi.fn();
    renderSidebar({ onRenameChat });

    fireEvent.click(screen.getByRole("button", { name: "Rename First chat" }));
    const input = screen.getByRole("textbox", { name: "Rename First chat" });
    fireEvent.change(input, { target: { value: "Should not save" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onRenameChat).not.toHaveBeenCalled();
    expect(screen.getByText("First chat")).toBeDefined();
  });
});

describe("ChatSidebar new chat shortcut hint", () => {
  it("exposes the new chat shortcut on the New chat control", () => {
    renderSidebar();

    const button = screen.getByRole("button", { name: /New chat/i });
    expect(button.getAttribute("title")).toMatch(/New chat \(.+\)/);
    expect(button.textContent).toMatch(/⌘⇧O|Ctrl\+Shift\+O/);
  });
});

describe("ChatSidebar search focus", () => {
  it("exposes the search shortcut and focuses on request", async () => {
    const { rerender } = render(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={vi.fn()}
        onSelectChat={vi.fn()}
        searchFocusRequest={0}
      />,
    );

    const search = screen.getByRole("searchbox", { name: "Search chats" });
    expect(search.getAttribute("title")).toMatch(/Search chats \(.+\)/);

    rerender(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={vi.fn()}
        onSelectChat={vi.fn()}
        searchFocusRequest={1}
      />,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(search);
    });
  });
});

describe("ChatSidebar search", () => {
  it("filters chats by title query", () => {
    renderSidebar();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search chats" }), {
      target: { value: "clickup" },
    });

    expect(screen.getByText("ClickUp planning")).toBeDefined();
    expect(screen.queryByText("First chat")).toBeNull();
  });

  it("shows an empty-results message when nothing matches", () => {
    renderSidebar();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search chats" }), {
      target: { value: "asana" },
    });

    expect(screen.getByText("No chats match")).toBeDefined();
    expect(screen.queryByText("First chat")).toBeNull();
    expect(screen.queryByText("ClickUp planning")).toBeNull();
  });
});
