import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "@/app/_components/projects-page";
import { listChatProjects, updateChatProject } from "@/lib/chat/chat-projects-api";
import { listChats } from "@/lib/chat/chats-api";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/chat/chat-projects-api", () => ({
  listChatProjects: vi.fn(),
  createChatProject: vi.fn(),
  updateChatProject: vi.fn(),
  deleteChatProject: vi.fn(),
}));

vi.mock("@/lib/chat/chats-api", () => ({
  listChats: vi.fn(),
  chatUrl: (id: string) => `/chat?c=${id}`,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(listChatProjects).mockResolvedValue([
    {
      id: "proj-1",
      name: "Research",
      createdAt: "2026-08-10T00:00:00.000Z",
      updatedAt: "2026-08-10T00:00:00.000Z",
      userId: "user-a",
      workspaceId: "ws-1",
    },
  ]);
  vi.mocked(listChats).mockResolvedValue({
    chats: [
      {
        id: "chat-1",
        title: "In research",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        visibility: "personal",
        userId: "user-a",
        revision: 0,
        pinnedAt: null,
        archivedAt: null,
        projectId: "proj-1",
      },
    ],
    canCreateShared: false,
    viewerUserId: "user-a",
  });
});

describe("ProjectsPage", () => {
  it("lists projects and their chats", async () => {
    render(<ProjectsPage />);

    expect(await screen.findByRole("heading", { name: "Projects" })).toBeDefined();
    expect(await screen.findByText("Research")).toBeDefined();
    expect(screen.getByText("In research")).toBeDefined();
    expect(screen.getByText("1 chat")).toBeDefined();
  });

  it("starts a new chat in a project", async () => {
    render(<ProjectsPage />);
    await screen.findByText("Research");

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(push).toHaveBeenCalledWith("/chat");
  });

  it("opens the create dialog", async () => {
    render(<ProjectsPage />);
    await screen.findByText("Research");

    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    expect(await screen.findByRole("heading", { name: "New project" })).toBeDefined();
  });

  it("renames a project from the overflow menu", async () => {
    vi.mocked(updateChatProject).mockResolvedValue({
      id: "proj-1",
      name: "Renamed",
      createdAt: "2026-08-10T00:00:00.000Z",
      updatedAt: "2026-08-10T00:00:00.000Z",
      userId: "user-a",
      workspaceId: "ws-1",
    });

    render(<ProjectsPage />);
    await screen.findByText("Research");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Project actions for Research" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    expect(await screen.findByRole("heading", { name: "Rename project" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateChatProject).toHaveBeenCalledWith("proj-1", { name: "Renamed" });
    });
  });
});
