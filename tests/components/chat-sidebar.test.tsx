import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatSidebar } from "@/components/chat/sidebar";
import type { ChatSummary } from "@/lib/chat/store/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
}));

afterEach(cleanup);

const chats: readonly ChatSummary[] = [
  {
    id: "chat-1",
    title: "First chat",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    visibility: "personal",
    userId: "user-a",
    revision: 0,
  },
  {
    id: "chat-2",
    title: "ClickUp planning",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    visibility: "shared",
    userId: "user-a",
    revision: 0,
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

describe("ChatSidebar navigation", () => {
  it("exposes destination links for playbooks, schedules, and tools", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "Playbooks" }).getAttribute("href")).toBe("/playbooks");
    expect(screen.getByRole("link", { name: "Schedules" }).getAttribute("href")).toBe("/schedules");
    expect(screen.getByRole("link", { name: "Tools" }).getAttribute("href")).toBe("/tools");
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("href")).toBe("/chat");
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("ChatSidebar new chat shortcut hint", () => {
  it("exposes the new chat shortcut on the New chat control", async () => {
    renderSidebar();

    const button = await screen.findByRole("button", { name: /New chat \(/i });
    expect(button.getAttribute("title")).toMatch(/New chat \(.+\)/);
    expect(button.getAttribute("aria-label")).toMatch(/New chat \(.+\)/);
  });
});

describe("ChatSidebar toggle shortcut hint", () => {
  it("exposes the sidebar toggle shortcut on the collapse control", async () => {
    render(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={vi.fn()}
        onSelectChat={vi.fn()}
        onToggleSidebar={vi.fn()}
      />,
    );

    const button = await screen.findByRole("button", { name: /Collapse sidebar \(/i });
    expect(button.getAttribute("title")).toMatch(/Collapse sidebar \(.+\)/);
  });
});

describe("ChatSidebar compact nav", () => {
  it("marks the chats icon as the current page", () => {
    render(
      <ChatSidebar
        activeChatId="chat-1"
        brand={<span>Brain</span>}
        chats={chats}
        compact
        currentTitle="First chat"
        onDeleteChat={vi.fn()}
        onNewChat={vi.fn()}
        onRenameChat={vi.fn()}
        onSelectChat={vi.fn()}
        onToggleSidebar={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Playbooks" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Tools" }).getAttribute("href")).toBe("/tools");
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

  it("reopens recent chats before focusing search", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Collapse recent chats" }));
    expect(screen.queryByRole("searchbox", { name: "Search chats" })).toBeNull();

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
      const search = screen.getByRole("searchbox", { name: "Search chats" });
      expect(document.activeElement).toBe(search);
    });
  });
});

describe("ChatSidebar recent panel", () => {
  it("collapses and expands recent chats", () => {
    renderSidebar();

    expect(screen.getByRole("searchbox", { name: "Search chats" })).toBeDefined();
    expect(screen.getByRole("separator", { name: "Resize recent chats" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Collapse recent chats" }));
    expect(screen.queryByRole("searchbox", { name: "Search chats" })).toBeNull();
    expect(screen.queryByRole("separator", { name: "Resize recent chats" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand recent chats" }));
    expect(screen.getByRole("searchbox", { name: "Search chats" })).toBeDefined();
    expect(screen.getByRole("separator", { name: "Resize recent chats" })).toBeDefined();
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

  it("clears the query from the clear control", () => {
    renderSidebar();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search chats" }), {
      target: { value: "clickup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByRole("searchbox", { name: "Search chats" }).getAttribute("value")).toBe("");
    expect(screen.getByText("First chat")).toBeDefined();
  });
});
