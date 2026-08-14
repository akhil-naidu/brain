import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArchitectureDiagram, ArchitectureDiagramFrame } from "@/components/architecture-diagram";

afterEach(cleanup);

describe("ArchitectureDiagram", () => {
  it("renders a themeable svg", () => {
    const { container } = render(<ArchitectureDiagram />);
    const svg = container.querySelector("svg.brain-architecture-diagram");
    expect(svg).toBeTruthy();
    expect(svg?.querySelector("title")?.textContent).toContain("logical architecture");
  });

  it("wraps the diagram in a frame", () => {
    const { container } = render(<ArchitectureDiagramFrame />);
    expect(container.querySelector("figure")).toBeTruthy();
    expect(container.querySelector("svg.brain-architecture-diagram")).toBeTruthy();
  });
});
