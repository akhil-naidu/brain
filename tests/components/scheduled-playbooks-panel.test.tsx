import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduledPlaybooksPanel } from "@/components/chat/scheduled-playbooks-panel";

vi.mock("@/lib/chat/scheduled-playbooks-api", () => ({
  MAX_SCHEDULED_PLAYBOOKS: 6,
  listScheduledPlaybooks: vi.fn(async () => []),
  createScheduledPlaybookApi: vi.fn(),
  deleteScheduledPlaybookApi: vi.fn(),
  updateScheduledPlaybookApi: vi.fn(),
  runScheduledPlaybookNow: vi.fn(),
}));

afterEach(cleanup);

describe("ScheduledPlaybooksPanel empty playbooks", () => {
  it("points to create a playbook instead of a dead Add button", async () => {
    render(<ScheduledPlaybooksPanel onOpenChat={vi.fn()} playbooks={[]} />);

    const createLink = await screen.findByRole("link", { name: /Create/i });
    expect(createLink.getAttribute("href")).toBe("/playbooks");
    expect(screen.getByText(/Save a playbook first/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Add$/i })).toBeNull();
  });
});
