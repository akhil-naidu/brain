import { describe, expect, it } from "vitest";
import { buildCreateClickUpDocPrompt } from "@/lib/chat/create-clickup-doc";

describe("buildCreateClickUpDocPrompt", () => {
  it("builds a message-scoped prompt with the markdown body", () => {
    const prompt = buildCreateClickUpDocPrompt({
      markdown: "Hello from Brain",
      scope: "message",
    });

    expect(prompt).toContain("ClickUp Doc (not a task)");
    expect(prompt).toContain("Source: assistant reply");
    expect(prompt).toContain("Hello from Brain");
    expect(prompt).not.toContain("suggestion:");
  });

  it("includes a title suggestion for thread scope", () => {
    const prompt = buildCreateClickUpDocPrompt({
      title: "Sprint notes",
      markdown: "## User\n\nShip it",
      scope: "thread",
    });

    expect(prompt).toContain("Source: conversation");
    expect(prompt).toContain("suggestion: Sprint notes");
    expect(prompt).toContain("## User\n\nShip it");
  });
});
