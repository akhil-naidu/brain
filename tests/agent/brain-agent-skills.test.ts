import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_IDS = ["coding-on-attached-repo", "morning-brief", "open-pr-from-sandbox"] as const;

function readSkill(skillId: (typeof SKILL_IDS)[number]): string {
  const path = join(process.cwd(), "agent/skills", skillId, "SKILL.md");
  expect(existsSync(path), `missing skill at ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

function descriptionFrontmatter(markdown: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match) {
    return null;
  }
  const block = match[1] ?? "";
  const descriptionLine = block.split(/\r?\n/).find((line) => line.startsWith("description:"));
  if (!descriptionLine) {
    return null;
  }
  return descriptionLine.slice("description:".length).trim();
}

describe("brain agent skills", () => {
  it.each(SKILL_IDS)("%s exists with a non-empty description frontmatter", (skillId) => {
    const markdown = readSkill(skillId);
    const description = descriptionFrontmatter(markdown);
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
  });
});
