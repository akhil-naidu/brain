import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachedRepoControl } from "@/components/chat/attached-repo-control";

vi.mock("@/lib/chat/connections-status-api", () => ({
  fetchConnectionStatuses: vi.fn(async () => [
    { id: "github", displayName: "GitHub", status: "needs_sign_in" as const },
  ]),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    readonly children: ReactNode;
    readonly href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AttachedRepoControl", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens a dialog with synced fields and GitHub guidance", async () => {
    const onChange = vi.fn();
    render(<AttachedRepoControl onChange={onChange} repo={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Attach GitHub repository/i }));

    expect(screen.getByRole("heading", { name: /Attach repository/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Connect GitHub in/i)).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /Tools/i }).getAttribute("href")).toBe(
      "/tools?focus=github",
    );

    fireEvent.change(screen.getByLabelText(/Paste URL or owner\/repo/i), {
      target: { value: "https://github.com/acme/api/tree/feat/x" },
    });

    expect(screen.getByLabelText(/^Owner$/i)).toHaveProperty("value", "acme");
    expect(screen.getByLabelText(/^Repo$/i)).toHaveProperty("value", "api");
    expect(screen.getByLabelText(/Branch or tag/i)).toHaveProperty("value", "feat/x");

    fireEvent.click(screen.getByRole("button", { name: /^Attach$/i }));
    expect(onChange).toHaveBeenCalledWith({ owner: "acme", name: "api", ref: "feat/x" });
  });
});
