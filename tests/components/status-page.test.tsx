import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusPage } from "@/components/system/status-page";

afterEach(cleanup);

describe("StatusPage", () => {
  it("renders code, title, description, and link actions", () => {
    render(
      <StatusPage
        actions={[
          { href: "/", label: "Go home" },
          { href: "/chat", label: "Open chat", variant: "outline" },
        ]}
        code="404"
        description="Missing route"
        title="Page not found"
      />,
    );

    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByText("Missing route")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Open chat" }).getAttribute("href")).toBe("/chat");
  });

  it("invokes onClick actions", () => {
    const onClick = vi.fn();
    render(
      <StatusPage actions={[{ label: "Try again", onClick }]} description="Retry" title="Error" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
