import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatProjectBadge } from "@/components/chat/chat-project-badge";

afterEach(cleanup);

describe("ChatProjectBadge", () => {
  it("links to the projects page with the project name", () => {
    render(<ChatProjectBadge name="Research" />);

    const link = screen.getByRole("link", { name: "Research" });
    expect(link.getAttribute("href")).toBe("/projects");
    expect(link.getAttribute("title")).toBe("In project Research");
  });
});
