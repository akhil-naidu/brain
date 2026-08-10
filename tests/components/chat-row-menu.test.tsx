import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRowMenu } from "@/components/chat/chat-row-menu";

afterEach(cleanup);

describe("ChatRowMenu", () => {
  it("exposes the full active-chat action set", async () => {
    const onArchive = vi.fn();
    const onPin = vi.fn();
    const onRename = vi.fn();
    const onShare = vi.fn();

    render(
      <ChatRowMenu
        canShare
        chatTitle="Planning"
        onArchive={onArchive}
        onCreateProject={vi.fn()}
        onDelete={vi.fn()}
        onMoveToProject={vi.fn()}
        onPin={onPin}
        onRename={onRename}
        onShare={onShare}
        pinned={false}
        projectId={null}
        projects={[]}
        triggerVisible="always"
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Chat actions for Planning" }));
    expect(await screen.findByRole("menuitem", { name: "Share" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Pin chat" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Move to project" })).toBeDefined();

    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it("shows unarchive for archived chats", async () => {
    const onUnarchive = vi.fn();
    render(
      <ChatRowMenu
        canShare={false}
        chatTitle="Old thread"
        onDelete={vi.fn()}
        onUnarchive={onUnarchive}
        pinned={false}
        projectId={null}
        projects={[]}
        triggerVisible="always"
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Chat actions for Old thread" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Unarchive" }));
    expect(onUnarchive).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).toBeNull();
  });
});
