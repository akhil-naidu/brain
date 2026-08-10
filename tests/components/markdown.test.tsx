import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "@/components/chat/markdown";

afterEach(cleanup);

describe("Markdown polish", () => {
  it("renders table controls including copy and download", async () => {
    render(
      <Markdown>{`| Name | Value |
| --- | --- |
| Alpha | 1 |
| Beta | 2 |`}</Markdown>,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Copy table")).toBeTruthy();
      expect(screen.getByTitle("Download table")).toBeTruthy();
      expect(document.querySelector('[data-streamdown="table-wrapper"]')).toBeTruthy();
    });
  });

  it("renders a code block with a copy control", async () => {
    render(
      <Markdown>{`\`\`\`ts
const answer = 42;
\`\`\``}</Markdown>,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Copy Code")).toBeTruthy();
      expect(document.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
    });
  });
});
