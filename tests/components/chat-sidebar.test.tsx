import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
];

describe("ChatSidebar rename", () => {
  it("renames a chat through onRenameChat", async () => {
    const onRenameChat = vi.fn();

    render(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={onRenameChat}
        onSelectChat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename First chat" }));
    const input = screen.getByRole("textbox", { name: "Rename First chat" });
    fireEvent.change(input, { target: { value: "Renamed chat" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameChat).toHaveBeenCalledWith("chat-1", "Renamed chat");
  });

  it("cancels rename on Escape without calling onRenameChat", () => {
    const onRenameChat = vi.fn();

    render(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={onRenameChat}
        onSelectChat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename First chat" }));
    const input = screen.getByRole("textbox", { name: "Rename First chat" });
    fireEvent.change(input, { target: { value: "Should not save" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onRenameChat).not.toHaveBeenCalled();
    expect(screen.getByText("First chat")).toBeDefined();
  });
});
