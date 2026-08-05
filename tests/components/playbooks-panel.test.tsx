import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybooksPanel } from "@/components/chat/playbooks-panel";
import type { Playbook } from "@/lib/chat/playbooks";

afterEach(cleanup);

const sample: Playbook = {
  id: "p1",
  label: "Sprint risks",
  prompt: "List sprint risks.",
  updatedAt: 1,
};

describe("PlaybooksPanel", () => {
  it("runs a saved playbook", () => {
    const onRun = vi.fn();
    render(
      <PlaybooksPanel onDelete={vi.fn()} onRun={onRun} onSave={vi.fn()} playbooks={[sample]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sprint risks" }));
    expect(onRun).toHaveBeenCalledWith("List sprint risks.");
  });

  it("shows empty guidance when there are no playbooks", () => {
    render(<PlaybooksPanel onDelete={vi.fn()} onRun={vi.fn()} onSave={vi.fn()} playbooks={[]} />);
    expect(screen.getByText(/Save prompts you reuse/i)).toBeDefined();
  });
});
