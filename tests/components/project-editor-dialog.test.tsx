import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectEditorDialog } from "@/components/chat/project-editor-dialog";

afterEach(cleanup);

describe("ProjectEditorDialog", () => {
  it("creates a project with the trimmed name", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<ProjectEditorDialog onOpenChange={onOpenChange} onSave={onSave} open project={null} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Research  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: "Research" });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("renames an existing project", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectEditorDialog
        onOpenChange={vi.fn()}
        onSave={onSave}
        open
        project={{
          id: "proj-1",
          name: "Old name",
          createdAt: "2026-08-10T00:00:00.000Z",
          updatedAt: "2026-08-10T00:00:00.000Z",
          userId: "user-a",
          workspaceId: "ws-1",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rename project" })).toBeDefined();
    expect(screen.getByDisplayValue("Old name")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: "New name" });
    });
  });

  it("keeps the dialog open and shows an error when save fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Name already used"));
    const onOpenChange = vi.fn();
    render(<ProjectEditorDialog onOpenChange={onOpenChange} onSave={onSave} open project={null} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dup" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Name already used");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
