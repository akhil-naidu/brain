import { describe, expect, it } from "vitest";
import {
  MORNING_BRIEF_PROMPT,
  MORNING_BRIEF_PROMPT_ID,
  WELCOME_PROMPTS,
} from "@/lib/chat/welcome-prompts";

describe("WELCOME_PROMPTS", () => {
  it("provides a small set of labeled starter prompts", () => {
    expect(WELCOME_PROMPTS.length).toBeGreaterThanOrEqual(3);
    expect(WELCOME_PROMPTS.length).toBeLessThanOrEqual(6);
    for (const prompt of WELCOME_PROMPTS) {
      expect(prompt.id.trim().length).toBeGreaterThan(0);
      expect(prompt.label.trim().length).toBeGreaterThan(0);
      expect(prompt.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses unique ids", () => {
    const ids = WELCOME_PROMPTS.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leads with the morning brief starter", () => {
    const first = WELCOME_PROMPTS[0];
    expect(first?.id).toBe(MORNING_BRIEF_PROMPT_ID);
    expect(first?.primary).toBe(true);
    expect(first?.prompt).toBe(MORNING_BRIEF_PROMPT);
    expect(first?.label.toLowerCase()).toContain("waiting");
  });
});
